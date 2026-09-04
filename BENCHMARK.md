# Benchmarks

Every number here was measured on the machine described below. Where a
figure is absent it is because it was not measured, not because it was
inconvenient.

## Machine

| | |
|---|---|
| Host | Apple Silicon, 10 cores, 16 GB RAM, macOS 24.6.0 |
| Runtime | Node v24.14.0 |
| Kafka | apache/kafka 3.9.1, KRaft, single broker, 8 partitions |
| Temporal | temporalio/auto-setup 1.26.2, Postgres 16 persistence, **512 history shards** |
| Containers | Docker Desktop 27.3.1 |
| Database | Supabase hosted Postgres, `aws-1-us-east-1` (so tiers A and D include real WAN latency) |
| LLM | `LLM_MODE=stub` for all throughput tiers |

Two things that materially affect these numbers and are disclosed rather
than buried:

- **Docker Desktop on macOS** runs containers in a Linux VM with a
  virtualised filesystem. Temporal's persistence path pays for that.
  Expect meaningfully better figures on bare-metal Linux.
- **Temporal's Postgres runs with `synchronous_commit=off`.** Legitimate
  for a benchmark — we are measuring Temporal, not an SSD's fsync — but
  it is not a durability-preserving setting and the numbers would be
  lower with it on.

Why `LLM_MODE=stub`: measuring end-to-end against a real model measures
OpenAI's queue, not this pipeline, and costs money per run. The stub
returns a canned payload that satisfies every validator predicate, so
the same code paths execute.

---

## Tier A — enqueue

**What:** time from HTTP request to a `runId` coming back.

**Result: ~1 second**, and independent of how long the agent then takes.

Measured through the real path — `POST /functions/v1/agent-run` on
hosted Supabase — so it includes JWT verification, the RPC, and a WAN
round trip from a home connection. The point of the tier is not the
absolute figure but that it does not grow with agent duration: the same
~1s whether the run finishes in 2 seconds or 60.

```
scripts/e2e.sh
```

---

## Tier B — broker throughput

**What:** sustained produce rate into an 8-partition topic.

```
cd server && npm run bench:kafka -- 100000 500
```

```json
{
  "messages": 100000,
  "batchSize": 500,
  "messageBytes": 170,
  "acks": "all",
  "idempotent": true,
  "partitions": 8,
  "seconds": 1.55,
  "messagesPerSecond": 64338,
  "megabytesPerSecond": 10.43
}
```

**Result: 64,338 msg/s (10.4 MB/s)** with `acks=all` and an idempotent
producer.

This tier exists to establish that Kafka is nowhere near the bottleneck,
so that when a later tier is slower we know where to look. It is not a
claim about Kafka; it is a claim about where our constraint isn't.

---

## Tier C — orchestration

**What:** Temporal's own scheduling cost, isolated from everything else.

```
cd server && npm run bench:orchestration -- 2000 100
```

| Metric | Result |
|---|---|
| Workflow **starts**/s | **396** |
| Workflow **completions**/s | **47** |

Reported separately because they differ by roughly 8×, and quoting the
larger one alone would be misleading. A start is one RPC plus one
mutable-state write. A completion additionally involves workflow tasks,
an activity task, and the history writes for all of it.

The benchmark workflow calls one trivial in-process activity, so no LLM
call and no cross-internet database write is folded into a number
labelled "orchestration". **The real `generateProblemWorkflow` is
substantially slower** — six activities, each writing events to a
database an ocean away.

### What moved the number, and what didn't

Raising client concurrency from 100 to 300 made it **worse** — 47/s down
to 40/s — while Temporal sat at 35% CPU and its Postgres at 16%. Neither
was saturated, and the client was not the constraint.

The limit is per-round-trip latency through Docker Desktop's filesystem
layer, not capacity. Knobs worth trying next, in the order likely to
matter: more worker processes (the workflow sandbox is single-threaded
per worker), then running Temporal on Linux rather than Docker Desktop.
`NUM_HISTORY_SHARDS` was already set to 512 — the default of 4 caps
throughput severely and is immutable after first boot.

---

## Tier D — zero loss under process failure

**This is the tier that validates the architecture rather than a
component.** The throughput figures above are context; this is the
finding.

```
bench/zero-loss.sh 40 --chaos
```

The harness enqueues N runs in one transaction, then SIGKILLs the relay,
the consumer and the worker in turn while they are mid-flight,
restarting each. `kill -9` specifically: Temporal handles SIGINT and
SIGTERM by draining gracefully, which would prove nothing.

### Result

```
enqueued            = 40
succeeded           = 40
failed              = 0
still queued/running= 0
outbox unpublished  = 0
distinct problems   = 40
duplicate problems  = 0

  PASS  every run reached succeeded (40/40)
  PASS  exactly one problem per run, no duplicates (40)
  PASS  outbox fully drained
```

**40 in, 40 out, zero duplicates, with all three processes killed
mid-flight.** Baseline without chaos: 60/60.

### What this tier caught

It found a bug that no steady-state test could have. With `autoCommit`
disabled, kafkajs's `commitOffsetsIfNecessary()` does nothing when called
without arguments, so the consumer group had **never committed an
offset** — `CURRENT-OFFSET` was `-` on all eight partitions.

Invisible while the consumer stayed up, because a running consumer reads
messages live and never consults a committed offset. On restart it
resumed from the end of the log and permanently skipped the backlog: 40
enqueued, outbox fully drained to Kafka, **0 workflows started**.

Fixed by committing explicitly with `consumer.commitOffsets()` and
subscribing with `fromBeginning: true`. That is the entire argument for
running this tier.

---

## Reproducing

```bash
docker compose up -d                     # Kafka, Temporal, both UIs
cd server && npm run topics              # once

# three terminals
cd server && npm run relay
cd server && npm run consumer
cd server && LLM_MODE=stub npm run worker

# then
scripts/e2e.sh                           # 15 assertions, whole pipeline
bench/zero-loss.sh 40 --chaos            # tier D
cd server && npm run bench:kafka -- 100000 500
cd server && npm run bench:orchestration -- 2000 100
```

## A number not claimed

The project's original write-up cited **2,000 async inference
requests/second**. That figure was never measured and is not reproduced
here. What is measured is above: 64,338 msg/s into the broker, 396
workflow starts/s, 47 completions/s for a trivial workflow, and 40/40
delivery under deliberate process failure.
