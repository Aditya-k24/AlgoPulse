# 3. SSE to the client, and tailing the table instead of Realtime

**Status:** accepted

## Context

The client needs to see a run progress: phase changes, model output as
it is produced, and a terminal result. Two questions: what protocol
carries it to the device, and how does the server learn about new events.

## Decision A — SSE, not WebSocket

Traffic is one-directional. The client sends nothing after the initial
request, so a bidirectional protocol buys nothing and costs connection
state to manage inside an ephemeral serverless function.

SSE also has replay in the protocol. `Last-Event-ID` on reconnect,
paired with the monotonic `seq` on `agent_events`, means resuming is a
range query rather than a bespoke catch-up mechanism.

### The constraint that made this load-bearing

Free-tier Supabase Edge Functions stop at **150 seconds of wall clock**,
and Supabase's own troubleshooting docs name long SSE forwarding as a
trigger for early shutdown.

So `agent-stream` **retires itself at ~100 s**: it emits a `retry:` hint
and closes cleanly rather than being cut off mid-frame. The client
reconnects with `Last-Event-ID` and resumes.

This means **any run longer than ~100 s will be resumed at least once**.
Reconnect is not an edge case here; it is the normal path, which is why
the event log is append-only with a gapless sequence.

### Cost accepted

React Native's built-in `fetch` is an XMLHttpRequest polyfill with **no
`response.body` at all**, so streaming over it is impossible rather than
merely awkward. `expo/fetch` is native-backed and exposes a real
`ReadableStream` — confirmed working in Expo Go, no dev build required.

`EventSource`'s automatic reconnect is browser behaviour that raw fetch
does not provide, so we own it: an incremental SSE parser handling all
three line-ending styles and frames split across arbitrary chunk
boundaries, plus reconnect with backoff. Pure functions, so they test
without a device.

## Decision B — tail the table, do not subscribe to Realtime

The obvious way for `agent-stream` to learn about new events is
Supabase Realtime's `postgres_changes`. We designed on that, then read
the limits.

Supabase documents `postgres_changes` at roughly **64 database changes
per second**. Changes are processed on a **single thread** to preserve
ordering, and each event is **re-authorised per subscriber** — so the
budget is divided by subscriber count, not driven by write rate. A
larger instance does not help.

Our generate activity emits an event roughly every 250 ms per run. At
about six events per second per run, **twenty concurrent runs already
exceeds the ceiling**, and the failure mode is silent: events delayed or
dropped with no error.

So `agent-stream` reads `agent_events` directly on a 200 ms indexed
primary-key range scan — `where run_id = $1 and seq > $2 order by seq`,
which the `(run_id, seq)` primary key serves exactly.

### Yes, that is a poll

The distinction that matters is *which side* polls.

The client makes **zero round trips** and holds one push connection.
What was removed is a mobile device polling over the internet, at the
mercy of radio wake-ups and RTT, once per user per interval. What
remains is an indexed range scan running next to the data, once per
connected viewer. Those are not the same cost, and only one of them was
ever the bottleneck.

## Consequences

**Accepted:** one function instance per viewer, each running its own
tail. That is the first thing that breaks at scale.

**Upgrade path:** Realtime **Broadcast** rather than `postgres_changes` —
it skips per-subscriber authorisation and is what Supabase itself
recommends above a few thousand subscribers. Worth doing past roughly 1k
concurrent viewers, not before.

**Gained:** no dependency on a subsystem whose documented ceiling we
would exceed at twenty concurrent users, and a failure mode that is loud
rather than silent.

## Verified

`src/lib/sse.test.ts` reassembles frames at every possible split offset
and covers resume, heartbeats and malformed input.
`src/hooks/agentReducer.test.ts` asserts that replaying an entire stream
produces identical state — the property that makes reconnect safe.
Measured on a physical device: the character counter climbed 128 → 1,689
→ 3,631 over a live run, against 28 server-side token events.
