# AlgoPulse

A spaced-repetition trainer for algorithms. Problems are written on
demand by an agent that survives being killed mid-run.

The premise: you don't forget a technique because you never understood
it, you forget it because nothing brought it back at the right moment.
AlgoPulse schedules recalls with SM-2 — one day, then six, then
intervals that expand by an ease factor — and when one is due it shows a
one-screen summary rather than making you re-solve the problem.

Practice content is generated per topic by a durable agent pipeline,
which is where most of the engineering lives.

## Stack

React Native (Expo SDK 54) · Supabase (Postgres, Auth, Edge Functions) ·
Temporal · Kafka · TypeScript throughout

## Quick start

```bash
npm install
cd server && npm install && cd ..

docker compose up -d              # Kafka, Temporal, both UIs
cd server && npm run topics       # once per fresh broker
```

Three terminals for the backend:

```bash
cd server && npm run relay
cd server && npm run consumer
cd server && npm run worker       # LLM_MODE=stub to run free and fast
```

And the app:

```bash
npx expo start
```

Full setup, demo steps and troubleshooting: **[RUNBOOK.md](RUNBOOK.md)**

## How it works

A generation request is accepted and written to Postgres in one
transaction, handed to a durable workflow engine, and streamed back to
the device as it runs.

```
phone ──POST──► agent-run ──┐
                            ├─ one txn: agent_runs + agent_outbox
                            └─ NOTIFY ──► relay ──► Kafka ──► consumer
                                                                 │
                                                                 ▼
phone ◄──SSE─── agent-stream ◄── agent_events ◄──── Temporal worker
                                                    plan → retrieve →
                                                    generate → validate
                                                    ⇄ repair → persist
```

The shape follows from one constraint: **the work outlives the request,
so the request cannot be the thing that owns it.** A serverless function
here stops at 150 seconds, and if the phone owns the work then closing
the app kills it.

Design reasoning: **[ARCHITECTURE.md](ARCHITECTURE.md)** and the
[ADRs](docs/adr/).

## Verifying it

```bash
npm test                    # client — SSE parser, event reducer
cd server && npm test       # server — workflow, validator, outbox
scripts/e2e.sh              # 15 assertions across the whole pipeline
```

66 tests. The outbox suite runs against a real Postgres because
`SKIP LOCKED` and statement-level `NOTIFY` are Postgres semantics —
mocking them would only test the mock. Workflow tests use Temporal's
time-skipping environment, so retry backoff is asserted in milliseconds.

## Benchmarks

| Tier | Measured |
|---|---|
| Enqueue | ~1s to a runId, independent of agent duration |
| Broker | 64,338 msg/s (acks=all, idempotent, 8 partitions) |
| Orchestration | 396 workflow starts/s · 47 completions/s |
| **Zero loss** | **40 in, 40 out, no duplicates — with the relay, consumer and worker all SIGKILLed mid-flight** |

Methodology, machine spec and caveats: **[BENCHMARK.md](BENCHMARK.md)**

The last row is the one that validates the architecture. It also caught a
bug no steady-state test could have: the Kafka consumer group had never
committed an offset, so a restarted consumer silently skipped its
backlog.

## Chaos demos

```bash
# durable workflows — kill -9, not Ctrl-C, which drains gracefully
kill -9 $(pgrep -f "tsx src/worker.ts")

# self-repair — first generation returns a schema-invalid payload
cd server && LLM_MODE=stub CHAOS_INVALID_PAYLOAD=1 npm run worker
```

## Layout

```
src/            React Native app
  lib/sse.ts      incremental SSE parser
  hooks/          run reducer and streaming hook
shared/         event contract, imported by client and server
server/         backend — relay, consumer, Temporal worker
  src/workflows.ts   the durable state machine
  src/activities.ts  everything non-deterministic
  src/validate.ts    11 predicates; its errors ARE the repair prompt
supabase/
  migrations/     schema (agent_runs, agent_events, agent_outbox)
  functions/      agent-run, agent-stream
bench/          load and chaos harness
docs/adr/       why the three big decisions went the way they did
archive/        superseded screens and docs, kept for reference
```

## Known limits

- Validation is **structural, not semantic** — it checks a generated
  problem is well-formed, not that its solution is correct. Executing
  the generated code against its own test cases is the next step.
- Single-node Kafka and Temporal, replication factor 1. No HA.
- Kafka adds no capability today; Temporal is already a durable queue.
  It earns its place at the second consumer group.
- No metrics, tracing or alerting. Consumer lag is the first to add.

## Environment

Copy `env.example` to `.env`. The one entry worth reading twice:

```
SUPABASE_DB_URL_SESSION=...pooler.supabase.com:5432/postgres
```

Port **5432** — the session-mode pooler. `LISTEN` does not survive the
transaction pooler on 6543, and the relay would silently degrade to its
fallback sweep.
