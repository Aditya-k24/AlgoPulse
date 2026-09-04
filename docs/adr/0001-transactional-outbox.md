# 1. Transactional outbox instead of publishing from the Edge Function

**Status:** accepted

## Context

Accepting a generation request means doing two things: recording the run
in Postgres, and getting it to a worker. The obvious implementation is
for the Edge Function to insert the row and then publish to Kafka.

That has no correct ordering:

- **Insert, then publish.** Crash in between and the run exists with
  nothing to process it. Silently stuck forever.
- **Publish, then insert.** Crash in between and work is dispatched for
  a row that never committed. The worker fails on a run it cannot find.

There is no distributed transaction available here. Kafka does not
participate in XA, and even if it did, a Deno Edge Function on Supabase
cannot hold a TCP connection to a broker running on a laptop.

## Decision

The event **is** a row. `enqueue_agent_run` inserts into `agent_runs` and
`agent_outbox` inside one function body, which is one implicit
transaction — both commit or neither does.

A separate relay process drains the outbox and publishes to Kafka. It
sleeps on `LISTEN`/`NOTIFY` rather than polling, with a 5-second sweep as
a safety net because `NOTIFY` is fire-and-forget and is lost if nobody
is listening at that instant.

Claiming uses `FOR UPDATE SKIP LOCKED`, with row locks deliberately held
across the publish, so concurrent relays take disjoint batches with no
coordination.

## Consequences

**Accepted:** one extra hop, and at-least-once delivery. A relay crash
between the Kafka produce and the `published_at` update leaves the row
claimable, so it is published twice.

That duplicate is deliberate. The alternative — marking published before
producing — converts duplicates into *lost messages*, which is strictly
worse. Duplicates are absorbed downstream by `workflowId = runId`
(ADR&nbsp;0002).

**Gained:** the request can never be half-accepted, the relay scales
horizontally without coordination, and the outbox doubles as a record of
what was dispatched.

**Also:** it answers the obvious objection. Replacing client polling with
server polling would be no improvement, and `LISTEN`/`NOTIFY` means the
relay is genuinely event-driven.

## Verified

`server/test/outbox.test.ts` asserts against a real Postgres that
concurrent relays claim disjoint rows without blocking, that a publish
throwing after the claim leaves rows claimable rather than lost, and
that a 50-row insert raises exactly one `NOTIFY`.
