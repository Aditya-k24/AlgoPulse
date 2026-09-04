/**
 * A scratch Postgres for the outbox tests.
 *
 * These tests exercise Postgres semantics — FOR UPDATE SKIP LOCKED, rollback
 * behaviour, statement-level NOTIFY — so they must run against a real server.
 * Mocking them would test the mock.
 *
 * Uses the Postgres already running in compose for Temporal, in its own
 * database, so no extra container is needed.
 */
import { Pool } from 'pg';

const ADMIN_URL =
  process.env.TEST_PG_ADMIN_URL ?? 'postgresql://temporal:temporal@localhost:55432/postgres';

export const TEST_DB = 'algopulse_test';
export const TEST_URL =
  process.env.TEST_PG_URL ?? `postgresql://temporal:temporal@localhost:55432/${TEST_DB}`;

/**
 * The subset of the real migration these tests need, with the FKs to
 * auth.users and public.problems removed since neither exists here. The
 * agent_outbox definition and its trigger are otherwise identical to
 * supabase/migrations/20260902160000_agent_orchestration.sql — keep them in
 * step.
 */
const SCHEMA = `
  drop table if exists agent_outbox cascade;
  drop table if exists agent_runs cascade;

  create table agent_runs (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null,
    status     text not null default 'queued',
    last_seq   bigint not null default 0,
    created_at timestamptz not null default now()
  );

  create table agent_outbox (
    id           bigint generated always as identity primary key,
    run_id       uuid not null references agent_runs(id) on delete cascade,
    topic        text not null default 'agent.runs.requested',
    payload      jsonb not null,
    created_at   timestamptz not null default now(),
    published_at timestamptz,
    attempts     int not null default 0
  );

  create index agent_outbox_pending_idx on agent_outbox (id) where published_at is null;

  create or replace function agent_outbox_notify() returns trigger
  language plpgsql as $$
  begin
    perform pg_notify('agent_outbox', '');
    return null;
  end $$;

  drop trigger if exists agent_outbox_notify_t on agent_outbox;
  create trigger agent_outbox_notify_t
    after insert on agent_outbox
    for each statement execute function agent_outbox_notify();
`;

/** Creates the scratch database if absent, then (re)builds the schema. */
export async function setupTestDb(): Promise<Pool> {
  const admin = new Pool({ connectionString: ADMIN_URL, max: 1 });
  try {
    const { rows } = await admin.query('select 1 from pg_database where datname = $1', [TEST_DB]);
    if (rows.length === 0) {
      // CREATE DATABASE cannot run inside a transaction block.
      await admin.query(`create database ${TEST_DB}`);
    }
  } finally {
    await admin.end();
  }

  const pool = new Pool({ connectionString: TEST_URL, max: 10 });
  await pool.query(SCHEMA);
  return pool;
}

/** Inserts a run plus `count` pending outbox rows, returning the run id. */
export async function seedOutbox(pool: Pool, count: number): Promise<string> {
  const {
    rows: [run],
  } = await pool.query<{ id: string }>(
    `insert into agent_runs (user_id) values (gen_random_uuid()) returning id`
  );
  const runId = run!.id;

  await pool.query(
    // Both casts are explicit: using $1 as uuid in one place and text in
    // another leaves Postgres unable to deduce a single parameter type.
    `insert into agent_outbox (run_id, payload)
     select $1::uuid, jsonb_build_object('runId', ($1::uuid)::text, 'n', g)
       from generate_series(1, $2::int) g`,
    [runId, count]
  );
  return runId;
}

export async function pendingCount(pool: Pool): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    'select count(*) as n from agent_outbox where published_at is null'
  );
  return Number(rows[0]!.n);
}
