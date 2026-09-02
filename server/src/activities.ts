/**
 * Temporal activities.
 *
 * Everything non-deterministic lives here: network calls, wall-clock time,
 * database writes. The workflow orchestrates these but never performs them,
 * which is what lets it be replayed safely after a crash.
 *
 * IMPORTANT: this module must never be imported for its *values* from
 * workflows.ts — only `import type`. A value import would drag openai, pg and
 * kafkajs into the workflow sandbox bundle and the worker would fail to
 * start.
 */
import { Context, ApplicationFailure } from '@temporalio/activity';
import { appendEvent, setRunStatus, recentTitles, getRun, profileIdFor, db } from './db';
import { streamCompletion } from './llm';
import { SYSTEM_PROMPT, buildUserPrompt, CREATIVE_HINTS } from './prompt';
import { validateProblem, buildRepairNote, type ProblemPayload } from './validate';
import type { AgentEvent, Phase } from '../../shared/agentEvents';
import { logger, errField } from './logger';

const log = logger('activity');

/** Every user-visible event goes through an activity, so it is recorded in
 *  workflow history exactly once rather than replayed or skipped. */
export async function emit(runId: string, event: AgentEvent): Promise<void> {
  await appendEvent(runId, event);
}

export async function emitPhase(
  runId: string,
  phase: Phase,
  extra: { attempt?: number; errors?: string[] } = {}
): Promise<void> {
  await appendEvent(runId, { type: 'status', phase, ...extra });
}

export interface PlanResult {
  category: string | null;
  difficulty: string | null;
  creativeHint: string;
  userId: string;
}

/**
 * Reads the run row and settles what to generate.
 *
 * The creative hint index is chosen by the workflow and passed in, so a
 * replay reproduces the same prompt rather than drifting.
 */
export async function plan(runId: string, hintIndex: number): Promise<PlanResult> {
  const run = await getRun(runId);
  if (!run) {
    throw ApplicationFailure.nonRetryable(`no such run ${runId}`, 'UnknownRun');
  }
  await setRunStatus(runId, 'running');
  return {
    category: run.category,
    difficulty: run.difficulty,
    creativeHint: CREATIVE_HINTS[hintIndex % CREATIVE_HINTS.length]!,
    userId: run.user_id,
  };
}

export async function retrieveSimilar(): Promise<string[]> {
  return recentTitles(20);
}

export interface GenerateInput {
  runId: string;
  plan: PlanResult;
  existingTitles: string[];
  /** Validator feedback from the previous attempt; absent on the first. */
  repairNote?: string;
  attempt: number;
}

const FLUSH_CHARS = 256;
const FLUSH_MS = 250;

/**
 * Streams a completion, forwarding coalesced text to agent_events.
 *
 * Coalescing is mandatory rather than an optimisation: Supabase Postgres is
 * remote, so every flush is an internet round trip. One row per token would be
 * ~200 writes per run; this is closer to 8/sec and still reads as live.
 */
export async function generate(input: GenerateInput): Promise<string> {
  const ctx = Context.current();

  // A re-execution — either a Temporal retry after a crash, or a repair
  // attempt — produces different text, so resuming mid-stream is meaningless.
  // Tell the client to drop what it has buffered.
  if (ctx.info.attempt > 1 || input.attempt > 1) {
    await appendEvent(input.runId, {
      type: 'reset',
      attempt: input.attempt,
      reason: input.repairNote ? 'repair' : 'retry',
    });
  }

  const user = buildUserPrompt({
    category: input.plan.category,
    difficulty: input.plan.difficulty,
    existingTitles: input.existingTitles,
    creativeHint: input.plan.creativeHint,
    repairNote: input.repairNote,
  });

  let full = '';
  let buffer = '';
  let lastFlush = Date.now();

  const flush = async () => {
    if (!buffer) return;
    await appendEvent(input.runId, { type: 'token', text: buffer });
    buffer = '';
    lastFlush = Date.now();
  };

  for await (const delta of streamCompletion({
    system: SYSTEM_PROMPT,
    user,
    signal: ctx.cancellationSignal,
  })) {
    full += delta;
    buffer += delta;

    if (buffer.length >= FLUSH_CHARS || Date.now() - lastFlush > FLUSH_MS) {
      await flush();
      // Carries progress and proves liveness. The SDK throttles the actual
      // gRPC call, so calling this in a hot loop costs nothing.
      ctx.heartbeat({ chars: full.length });
    }
  }
  await flush();

  if (!full.trim()) {
    // Retrying an empty completion with identical input is pure waste.
    throw ApplicationFailure.nonRetryable('model returned no content', 'EmptyCompletion');
  }

  return full;
}

export interface ValidateResult {
  ok: boolean;
  errors: string[];
  repairNote?: string;
}

export async function validateOutput(raw: string): Promise<ValidateResult> {
  const result = validateProblem(raw);
  if (result.ok) return { ok: true, errors: [] };
  return { ok: false, errors: result.errors, repairNote: buildRepairNote(result.errors) };
}

export interface PersistInput {
  runId: string;
  userId: string;
  raw: string;
}

/**
 * Writes the problem and its children in ONE transaction.
 *
 * Idempotent on problems.run_id, which carries a unique constraint: an
 * activity re-executed after a crash must not create a second problem, and a
 * database constraint is both shorter and correct under concurrency where
 * application-level checking would race.
 */
export async function persist(input: PersistInput): Promise<{ problemId: string }> {
  const validated = validateProblem(input.raw);
  if (!validated.ok || !validated.payload) {
    throw ApplicationFailure.nonRetryable(
      `persist called with invalid payload: ${validated.errors.join('; ')}`,
      'InvalidPayload'
    );
  }
  const p: ProblemPayload = validated.payload;

  // problems.created_by references profiles(id) while agent_runs.user_id
  // references auth.users(id) — two different tables for "the user".
  const profileId = await profileIdFor(input.userId);

  const client = await db().connect();
  try {
    await client.query('BEGIN');

    const {
      rows: [problem],
    } = await client.query<{ id: string }>(
      `insert into problems
         (title, category, difficulty, description, solutions, methods,
          quick_refresh, pattern_name, visual_breakdown, test_cases,
          created_by, source, run_id)
       values ($1, $2::problem_category, $3::difficulty_level, $4, $5::jsonb, $6::text[],
               $7::text[], $8, $9, $10::jsonb, $11::uuid, 'agent', $12::uuid)
       on conflict (run_id) do update set updated_at = now()
       returning id`,
      [
        p.title,
        p.category,
        p.difficulty,
        p.description,
        JSON.stringify(p.solutions),
        p.methods,
        p.quick_refresh,
        p.pattern_name,
        p.visual_breakdown,
        JSON.stringify(
          p.test_cases.map((t, i) => ({ id: `test-${i + 1}`, ...t }))
        ),
        profileId,
        input.runId,
      ]
    );
    const problemId = problem!.id;

    // Delete-then-insert so a re-execution converges rather than duplicating.
    await client.query('delete from problem_explanations where problem_id = $1::uuid', [problemId]);
    for (const [i, a] of p.approaches.entries()) {
      await client.query(
        `insert into problem_explanations
           (problem_id, approach_name, approach_type, when_to_use, core_intuition,
            steps, time_complexity, space_complexity, pitfalls, display_order)
         values ($1::uuid, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10)`,
        [
          problemId, a.name, a.type, a.when_to_use, a.core_intuition,
          a.steps, a.time_complexity, a.space_complexity, a.pitfalls ?? null, i,
        ]
      );
    }

    await client.query('delete from problem_references where problem_id = $1::uuid', [problemId]);
    for (const [i, r] of p.references.entries()) {
      await client.query(
        `insert into problem_references
           (problem_id, reference_type, title, url, author, display_order)
         values ($1::uuid, $2, $3, $4, $5, $6)`,
        [problemId, r.type, r.title, r.url, r.author ?? null, i]
      );
    }

    await client.query(
      `update agent_runs set status = 'succeeded', problem_id = $2::uuid, updated_at = now()
        where id = $1::uuid`,
      [input.runId, problemId]
    );

    await client.query('COMMIT');
    log.info('persisted', { runId: input.runId, problemId, title: p.title });
    return { problemId };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    log.error('persist failed', { runId: input.runId, error: errField(e) });
    throw e;
  } finally {
    client.release();
  }
}

export async function markFailed(runId: string, message: string): Promise<void> {
  await setRunStatus(runId, 'failed', { error: message });
  await appendEvent(runId, { type: 'error', message });
}
