/**
 * Postgres access for the worker.
 *
 * Deliberately `pg` rather than supabase-js: the relay needs LISTEN, explicit
 * transactions and FOR UPDATE SKIP LOCKED, none of which PostgREST exposes.
 * A side benefit is that no service-role key exists anywhere in this process.
 */
import { Pool } from 'pg';
import { config } from './config';
import type { AgentEvent } from '../../shared/agentEvents';

let pool: Pool | undefined;

export function db(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
  }
  return pool;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/**
 * Appends one event to the run's log and returns its seq.
 *
 * seq is allocated inside append_agent_event under a row lock on agent_runs,
 * so concurrent emits from one run cannot collide or arrive out of order.
 */
export async function appendEvent(runId: string, event: AgentEvent): Promise<number> {
  const { type, ...data } = event;
  const { rows } = await db().query<{ seq: string }>(
    'select public.append_agent_event($1::uuid, $2::text, $3::jsonb) as seq',
    [runId, type, JSON.stringify(data)]
  );
  return Number(rows[0]!.seq);
}

export async function setRunStatus(
  runId: string,
  status: 'running' | 'succeeded' | 'failed' | 'cancelled',
  extra: { problemId?: string; error?: string } = {}
): Promise<void> {
  await db().query(
    `update agent_runs
        set status = $2,
            problem_id = coalesce($3, problem_id),
            error = coalesce($4, error),
            updated_at = now()
      where id = $1::uuid`,
    [runId, status, extra.problemId ?? null, extra.error ?? null]
  );
}

export interface RunRow {
  id: string;
  user_id: string;
  category: string | null;
  difficulty: string | null;
}

export async function getRun(runId: string): Promise<RunRow | null> {
  const { rows } = await db().query<RunRow>(
    'select id, user_id, category, difficulty from agent_runs where id = $1::uuid',
    [runId]
  );
  return rows[0] ?? null;
}

/**
 * Recent problem titles, used to steer the model away from near-duplicates.
 */
export async function recentTitles(limit = 20): Promise<string[]> {
  const { rows } = await db().query<{ title: string }>(
    'select title from problems order by created_at desc limit $1',
    [limit]
  );
  return rows.map((r) => r.title);
}

/**
 * problems.created_by references profiles(id), but agent_runs.user_id
 * references auth.users(id) — two different tables for "the user". Resolve
 * rather than assume they collide.
 */
export async function profileIdFor(userId: string): Promise<string | null> {
  const { rows } = await db().query<{ id: string }>(
    'select id from profiles where user_id = $1::uuid',
    [userId]
  );
  return rows[0]?.id ?? null;
}
