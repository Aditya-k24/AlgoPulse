# 2. Temporal instead of a queue and a status column

**Status:** accepted

## Context

A multi-step agent run needs to survive a worker dying halfway through.
The conventional approach is a job queue plus a `status` column, with the
application managing the state machine.

That is entirely buildable. The question is what you end up writing.

## Decision

Use Temporal. Each run is a workflow; each step is an activity.
`workflowId = runId`.

### What the alternative actually costs

| Requirement | Queue + status column | Temporal |
|---|---|---|
| Resume mid-run after a crash | Checkpoint every step yourself, and decide per step what is safe to redo | Event history replays completed steps for free |
| Per-step retry and backoff | Hand-rolled per step, plus a dead-letter path | Declarative `RetryPolicy` with `nonRetryableErrorTypes` |
| Detect a dead worker | Lease table, heartbeat rows, a reaper process, clock-skew bugs | `heartbeatTimeout`; the task is redispatched |
| Long-running steps | One visibility timeout that must exceed p99 latency, guessed | Separate schedule / start / heartbeat timeouts |
| Debug a failed run | Correlate logs across three services by request id | Full ordered history per run, in a UI, with inputs and outputs |

That is roughly a thousand lines you would own, and the failure modes
are the subtle kind — a lease that expires during a GC pause, a retry
that duplicates a side effect.

### The second thing it buys

`workflowId = runId` gives idempotency for free. Temporal enforces at
most one open execution per workflow id per namespace as a server-side
uniqueness constraint on the mutable-state record. The at-least-once
delivery that ADR&nbsp;0001 accepts becomes effectively-once work with no
dedupe table.

## Consequences

**Accepted:** a real operational dependency. Temporal is the heaviest
piece of infrastructure here — a server, a database, and a UI — and it
carries a genuine learning curve. Locally it is `docker compose`; in
production it is Temporal Cloud or a cluster somebody operates.

**Also accepted:** the workflow sandbox is restrictive by design. No
network, no clock, no `Math.random`, no value imports of anything that
touches I/O. Violating that fails at worker startup or, worse, at replay.

**Gained:** the crash-resume behaviour is not something we implemented
and hope works. It is a property of the engine, and it is demonstrable —
`kill -9` the worker mid-run and watch it continue.

## Alternatives considered

- **Airflow** — a scheduler for batch DAGs. Wrong shape for per-request
  workflows measured in seconds.
- **AWS Step Functions** — would work, but ties this to AWS and expresses
  control flow in JSON, which makes the repair loop (ADR&nbsp;0003)
  awkward.
- **Cadence** — Temporal's predecessor. Temporal is the maintained fork
  with the better TypeScript SDK.

## Verified

`server/test/workflow.test.ts` uses Temporal's time-skipping test
environment to assert the repair loop, its bound, transport retry, and
that non-retryable errors are attempted exactly once — all in
milliseconds of real time. `bench/zero-loss.sh 40 --chaos` asserts 40 in,
40 out, zero duplicates with all three processes SIGKILLed mid-flight.
