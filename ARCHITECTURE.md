# Architecture

AlgoPulse is a spaced-repetition trainer for algorithms. Problems are
written on demand by an agent that survives being killed mid-run.

This document covers how a generation request moves through the system,
why it is shaped this way, and what happens when each part fails.

## The problem this shape solves

The original implementation was one blocking HTTP request:

```ts
// src/services/problemService.ts — the old path, kept as the "before"
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-problem`);
```

That gave a 20–60 second blank screen with no progress and no cancel.
Worse, the connection *owned* the work: drop it and everything was lost,
including the tokens already paid for. Concurrency was capped by open
sockets rather than by compute.

The fix is not a faster prompt. It is that **the work outlives the
request, so the request cannot be the thing that owns it.**

## Request lifecycle

```
PHONE                      SUPABASE                    LAPTOP
─────                      ────────                    ──────
tap Generate
  │  POST /agent-run
  ├──────────────────────► verify JWT
  │                        enqueue_agent_run()
  │                          ├─ INSERT agent_runs      ┐ one
  │                          └─ INSERT agent_outbox    ┘ transaction
  │ ◄── { runId } ~1s        └─ NOTIFY agent_outbox ──────► relay (LISTEN)
  │                                                          │ SKIP LOCKED
  │  GET /agent-stream (SSE)                                 ▼
  ├──────────────────────► replay agent_events            Kafka
  │                        where seq > Last-Event-ID     (8 partitions)
  │                                │                        │
  │                                │                        ▼
  │                                │                     consumer
  │                                │                  workflowId = runId
  │                                │                        │
  │                                │                        ▼
  │                                │                  Temporal worker
  │                                │                        │
  │                                │   plan → retrieve → generate
  │                                │        → validate ⇄ repair
  │                                │        → persist
  │                                │                        │
  │ ◄── token, status, done ───────┴──── INSERT agent_events ┘
```

Everything on the laptop dials **out**. Nothing dials in, so there are
no tunnels, no port forwarding, and the phone only ever talks to
Supabase over HTTPS.

## The four decisions that shape it

### 1. Transactional outbox

You cannot make a Postgres write and a Kafka publish atomic. Write the
row first and crash, and the run exists with nothing to process it.
Publish first and crash, and work is dispatched for a row that never
committed.

So the event **is** a row, written in the same transaction as the run.
A relay tails it and publishes at-least-once. The relay sleeps on
`LISTEN`/`NOTIFY` rather than polling; the 5-second sweep is a safety net
only, because `NOTIFY` is lost if nobody is listening at that instant.

Claiming uses `FOR UPDATE SKIP LOCKED` with the row locks held across
the publish, so concurrent relays take disjoint batches with no
coordination — no leases, no `locked_until`, no clock skew.

A crash between publish and mark leaves `published_at` null and the row
is republished. That duplicate is deliberate; see below.

**Code:** `supabase/migrations/*_agent_orchestration.sql`,
`server/src/outbox.ts`, `server/src/relay.ts`

### 2. `workflowId = runId`

Duplicates enter from two places: the relay crashing after publishing but
before marking, and the consumer crashing after starting a workflow but
before committing its offset. Both collapse to *the same runId may reach
`workflow.start()` more than once.*

Temporal enforces at most one open execution per workflow id per
namespace — a server-side uniqueness constraint, not a best-effort
check. The second start returns a handle to the first. At-least-once
delivery becomes effectively-once work, with no dedupe table.

`problems.run_id` additionally carries a `unique` constraint, so an
activity re-executed after a crash converges on the same row rather than
creating a second problem. A database constraint rather than application
logic, because application-level checking races.

**Code:** `server/src/consumer.ts`, `server/src/activities.ts` (`persist`)

### 3. Two layers of retry

A Temporal `RetryPolicy` re-sends **byte-identical input**. There is no
hook to mutate it between attempts, so it structurally cannot express
"try again, knowing what was wrong".

- **Inner — `RetryPolicy`.** Transport failure: 429s, socket resets. The
  request was fine, the network was not. `nonRetryableErrorTypes` covers
  cases where retrying identical input is pure waste.
- **Outer — a bounded loop in the workflow.** Semantic failure: the
  model produced something structurally wrong. The validator returns
  field-level sentences, the loop feeds them into the next prompt, and
  the model corrects itself. Bounded at three generations, throwing
  non-retryable on exhaustion so a caller's own policy cannot multiply
  the spend.

**Code:** `server/src/workflows.ts`, `server/src/validate.ts`

### 4. The stream tails the table

`agent-stream` reads `agent_events` on a 200 ms indexed primary-key
range scan rather than subscribing to Supabase Realtime.

Realtime's `postgres_changes` is documented at roughly **64 database
changes per second**, processed on a single thread to preserve ordering
and re-authorised per subscriber — so the budget divides by subscriber
count. At ~6 events/second per run, twenty concurrent runs already
exceeds it, and the failure mode is silent loss.

Yes, that is a poll. The distinction that matters is *which side* polls:
the client makes zero round trips and holds one push connection. What
was removed is a phone polling over the internet at the mercy of radio
wake-ups and RTT. What remains is an indexed scan next to the data. Only
one of those was ever the bottleneck.

Upgrade path past ~1k concurrent viewers is Realtime **Broadcast**,
which skips per-subscriber authorisation.

**Code:** `supabase/functions/agent-stream/index.ts`

## The event log

`agent_events` is append-only with a monotonic `seq` per run, allocated
under a row lock, and `unique(run_id, seq)`. That single constraint
provides:

- **Reconnect** — the client resumes with `Last-Event-ID`
- **Replay** — a late joiner gets the whole run
- **Idempotence** — the client reducer drops any `seq` at or below its
  high-water mark, so replay never duplicates the token buffer
- **Audit** — every run is reconstructable after the fact

This is load-bearing rather than incidental. Free-tier Edge Functions
stop at 150 seconds of wall clock, and Supabase's own docs call out long
SSE forwarding as a trigger for early shutdown. Rather than be cut off
mid-frame, `agent-stream` retires itself at ~100 s after sending a
`retry:` hint, and the client resumes. **Any run longer than that will
be resumed at least once**, so the seam has to be invisible.

## Failure model

| What dies | What happens |
|---|---|
| **Relay**, after publishing, before marking | Transaction aborts, `published_at` stays null, next relay republishes. Duplicate absorbed by `workflowId = runId`. |
| **Consumer**, after starting a workflow, before committing | Offset uncommitted, message redelivered, Temporal rejects the duplicate start. |
| **Worker**, mid-activity | No heartbeat arrives. At `heartbeatTimeout` (15 s) the server records `ActivityTaskTimedOut` and redispatches. A replacement worker replays history — completed activities return recorded results instantly; only the interrupted one re-executes. A `reset` event tells the client to clear its token buffer. |
| **Supabase**, mid-run | Event writes fail and Temporal retries with backoff. Workflow state lives in Temporal's own Postgres, so the run stalls rather than dying. No circuit breaker: a long outage means runs retry until `scheduleToCloseTimeout` (15 min). |
| **Phone**, connection dropped | Client reconnects with `Last-Event-ID` and replays from the log. |
| **Model returns garbage** | Validator rejects with field-level errors, the repair loop feeds them back, bounded at three attempts. |
| **Poison message** | Parked in `agent.runs.dlq` with origin topic, partition, offset and error in headers. Never blocks the partition. |

Verified by `bench/zero-loss.sh 40 --chaos`: 40 in, 40 out, zero
duplicates, with all three processes SIGKILLed mid-flight.

## Deliberate limits

- **Single-node.** One Kafka broker, one Temporal cluster, replication
  factor 1. Fine for a laptop demo, not for production.
- **Kafka adds no capability today.** Temporal is already a durable
  queue with retries and a DLQ equivalent; the consumer deserialises and
  makes one call. It earns its place at the second consumer group —
  analytics, audit, a second workflow type. Kept because that is the
  direction this goes.
- **Validation is structural, not semantic.** The pipeline checks that a
  generated problem is well-formed, not that its solution is *correct*.
  Executing the generated code against its own test cases is the obvious
  next step; `supabase/functions/execute-code` already wraps JDoodle and
  would slot in as an activity between validate and persist, with
  failures feeding the same repair loop.
- **The worker holds broad database credentials.** No service-role key
  exists anywhere — the worker uses `pg` directly and both Edge
  Functions act as the signed-in user via their JWT — but a
  least-privilege role for the worker is still the right next step.
- **No metrics, tracing or alerting.** Structured JSON logs and
  Temporal's UI. Consumer lag is the first metric worth adding.

## Connection budget

Supabase's **session-mode** pooler allows 15 clients for this project,
and a SIGKILLed process does not release its sessions — they linger
until Supavisor times them out.

Only the relay's `LISTEN` registration genuinely needs a session, since
transaction mode drops it at every implicit commit. Everything else is a
discrete query or transaction and uses the **transaction** pooler on
port 6543, which scales far further. Steady state is one session
connection and one transaction connection.

Getting this wrong is not subtle in its symptoms but is very subtle in
its cause: the first version claimed all 15 slots and agent runs began
failing with `EMAXCONNSESSION` under load.

**Code:** `server/src/config.ts`
