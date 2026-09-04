# Runbook

Bringing the system up, demoing it, and what to do when a piece misbehaves.

## Prerequisites

- Docker Desktop **running**
- `.env` with `SUPABASE_DB_URL_SESSION` pointing at the **session-mode**
  pooler (port **5432**, not 6543 — `LISTEN` does not survive the
  transaction pooler)
- `npm install` in both the repo root and `server/`

## Start

```bash
docker compose up -d                 # Kafka, Temporal, Temporal UI, Kafka UI
cd server && npm run topics          # once per fresh broker
```

Then three terminals — keep them **visible** during a demo, since one of
them is where you kill the worker:

```bash
cd server && npm run relay
cd server && npm run consumer
cd server && npm run worker          # add LLM_MODE=stub to run free and fast
```

And the app:

```bash
npx expo start
```

| Surface | URL |
|---|---|
| Temporal UI | http://localhost:8233 |
| Kafka UI | http://localhost:8080 |
| Metro | http://localhost:8081 |

### Phone

Same wifi: enter `exp://<your-lan-ip>:8081` in Expo Go.

Over USB (more reliable, immune to guest networks):

```bash
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8081"
```

> **Expo Go must match the SDK.** The project is SDK 54. Play Store will
> update Expo Go past it and the app then refuses to load. Either disable
> auto-update for Expo Go, or build a dev client with
> `npx expo run:android`, which removes the coupling entirely.

## Verify before presenting

```bash
scripts/e2e.sh                       # 15 assertions across the whole pipeline
```

Expect `15 passed, 0 failed`. It signs in, checks unauthenticated calls
are rejected, enqueues a run, streams it to completion, resumes from a
`Last-Event-ID`, and asserts the database state.

**Do a warm-up generation five minutes before you start.** It warms the
Kafka consumer group, Temporal's sticky cache, and the connection pool.
A cold first run looks slow for reasons unrelated to the design.

## Demo 1 — kill the worker mid-run

Start a generation on the phone. While tokens are streaming:

```bash
kill -9 $(pgrep -f "tsx src/worker.ts")
```

**`kill -9` specifically.** Temporal installs handlers for SIGINT and
SIGTERM and shuts down *gracefully* — it waits for the in-flight
activity to finish and the run completes normally. Ctrl-C would show
nothing.

What happens, and roughly when:

| | |
|---|---|
| t=0 | Process gone. Tokens stop. The connection stays open. |
| 0–15 s | Temporal is waiting on a heartbeat that will never arrive. |
| ~15 s | `heartbeatTimeout` fires; the workflow task is redispatched. |
| restart | New worker replays history. Completed activities return recorded results instantly; only the interrupted one re-executes. |
| resume | A `reset` event clears the client's buffer, generation continues, run completes. |

Restart with `cd server && npm run worker`, then cut to the Temporal UI
and show the timeout in the event history.

## Demo 2 — forced invalid payload, self-repair

```bash
cd server && LLM_MODE=stub CHAOS_INVALID_PAYLOAD=1 npm run worker
```

The first generation returns `"category": "Arrays"` (plural) and a single
approach. The validator rejects it with two field-level errors, those
become the next prompt, and attempt two passes. On the phone you see a
**repairing** step appear and resolve.

Not contrived: the category enum mismatch is the most likely real-world
repair trigger.

## Benchmarks

```bash
bench/zero-loss.sh 40 --chaos                        # tier D — the one that matters
cd server && npm run bench:kafka -- 100000 500       # tier B
cd server && npm run bench:orchestration -- 2000 100 # tier C
```

Results and methodology are in [BENCHMARK.md](BENCHMARK.md).

## Troubleshooting

**Nothing streams to the phone.** Walk the hops in order — this is also
a good thing to narrate on stage, since it demonstrates the system is
observable at every step:

1. Relay terminal — did it publish? (`{"component":"relay","message":"drained"}`)
2. Kafka UI — did the message land in `agent.runs.requested`?
3. Temporal UI — did a workflow start?
4. Worker terminal — is it processing?

**`EMAXCONNSESSION: max clients reached in session mode`.** Too many
session-pooler connections. Almost always zombie processes: check with
`pgrep -f 'src/(worker|relay|consumer).ts'`. Killing only the `tsx`
child leaves the `npm` parent alive, so kill both patterns:

```bash
pkill -9 -f "src/worker.ts"; pkill -9 -f "npm run worker"
```

SIGKILLed processes do not release their pooler sessions immediately —
they linger until Supavisor times them out, so allow a minute after a
cleanup before expecting slots back.

**Runs enqueue but never start.** Check consumer group lag:

```bash
docker exec algopulse-kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group agent-runner
```

`CURRENT-OFFSET` showing `-` means the group has never committed — the
consumer will skip anything published while it was down.

**Worker won't start: `LLM_MODE=live requires OPENAI_API_KEY`.** Either
set the key or run with `LLM_MODE=stub`.

**Temporal throughput is far lower than expected.** Check the shard
count:

```bash
docker exec algopulse-temporal-pg psql -U temporal -d temporal \
  -t -A -c "select count(*) from shards;"
```

It must be **512**. `temporalio/auto-setup` defaults to 4, and the value
is **immutable after first schema setup** — fixing it means
`docker compose down -v` and starting over.

## Reset

```bash
docker compose down          # keep volumes
docker compose down -v       # wipe Kafka and Temporal state entirely
```

The Supabase database is not touched by either. `bench/zero-loss.sh`
cleans up the rows it creates.

## Fallbacks during a live demo

| If | Then |
|---|---|
| The worker won't come back | Switch to the completed run already open in the Temporal UI and walk its history |
| OpenAI is slow or erroring | `LLM_MODE=stub` — say so plainly; it also makes the point that the stub exists so benchmarks measure your pipeline |
| The venue network dies | Everything but Supabase is local. Drive a run from `psql` and show events landing |
| The streaming UI misbehaves | `EXPO_PUBLIC_USE_LEGACY_GENERATION=1` restores the original blocking path |
