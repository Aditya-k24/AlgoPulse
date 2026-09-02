/**
 * The agent workflow.
 *
 * Runs in Temporal's deterministic sandbox: no network, no clock, no random.
 * Everything it does is a recorded decision, which is why a worker can be
 * killed mid-run and a replacement can pick the run back up exactly where it
 * left off.
 *
 * Note the `import type` below — importing activities for their values would
 * pull openai, pg and kafkajs into the sandbox bundle and break the worker.
 */
import { proxyActivities, ApplicationFailure, log, workflowInfo } from '@temporalio/workflow';
import type * as activities from './activities';

/** Fast, side-effect-light steps. Safe to retry with identical input. */
const { plan, retrieveSimilar, emit, emitPhase, markFailed } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3, initialInterval: '1s' },
});

/**
 * Generation.
 *
 * startToCloseTimeout is 5 minutes, not 60 seconds: a streamed 3000-token
 * completion has a p99 well past 90s under load, and a tight timeout converts
 * an ordinary slow call into a failure — then pays for the same tokens again
 * on the retry. Liveness comes from the heartbeat, not from this.
 *
 * The RetryPolicy here handles TRANSPORT failure only (429s, socket resets),
 * where retrying identical input is correct. Semantic failure is handled by
 * the repair loop below, because a RetryPolicy re-sends byte-identical input
 * and therefore cannot express "try again, knowing what was wrong".
 */
const { generate } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  heartbeatTimeout: '15 seconds',
  scheduleToCloseTimeout: '15 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
    nonRetryableErrorTypes: ['EmptyCompletion', 'InvalidApiKey', 'ContentPolicy'],
  },
});

const { validateOutput } = proxyActivities<typeof activities>({
  startToCloseTimeout: '15 seconds',
  retry: { maximumAttempts: 2 },
});

const { persist } = proxyActivities<typeof activities>({
  startToCloseTimeout: '60 seconds',
  retry: { maximumAttempts: 3, initialInterval: '1s' },
});

export interface RunInput {
  runId: string;
  userId: string;
}

export interface RunOutput {
  problemId: string;
  attempts: number;
}

/** One initial generation plus at most this many repair attempts. */
export const MAX_REPAIRS = 2;

export async function generateProblemWorkflow(input: RunInput): Promise<RunOutput> {
  const { runId } = input;

  try {
    await emitPhase(runId, 'plan');
    // Derived from the deterministic run id rather than Math.random, which
    // the sandbox forbids and which would break replay.
    const hintIndex = hashToIndex(workflowInfo().workflowId);
    const planned = await plan(runId, hintIndex);

    await emitPhase(runId, 'retrieve');
    const existingTitles = await retrieveSimilar();

    let repairNote: string | undefined;
    let lastErrors: string[] = [];

    for (let attempt = 1; attempt <= MAX_REPAIRS + 1; attempt++) {
      await emitPhase(runId, 'generate', { attempt });

      const raw = await generate({
        runId,
        plan: planned,
        existingTitles,
        repairNote, // <- changes per attempt; this is the whole point
        attempt,
      });

      await emitPhase(runId, 'validate', { attempt });
      const result = await validateOutput(raw);

      if (result.ok) {
        await emitPhase(runId, 'persist');
        const { problemId } = await persist({ runId, userId: planned.userId, raw });
        // Terminal event: this is what tells the client the run is complete,
        // closes the SSE stream, and carries the id to navigate to.
        await emit(runId, { type: 'done', problemId });
        return { problemId, attempts: attempt };
      }

      lastErrors = result.errors;
      log.warn('validation failed', { attempt, errors: result.errors });
      await emitPhase(runId, 'repair', { attempt, errors: result.errors });
      repairNote = result.repairNote;
    }

    // Bounded loop exhausted. Non-retryable so that a caller's own workflow
    // retry policy cannot silently triple the LLM spend for the same bad
    // model behaviour.
    throw ApplicationFailure.nonRetryable(
      `validation failed after ${MAX_REPAIRS + 1} attempts`,
      'ValidationExhausted',
      { errors: lastErrors }
    );
  } catch (e) {
    // Best-effort: record the failure so the client sees a real error rather
    // than a stream that simply stops.
    await markFailed(runId, rootMessage(e)).catch(() => {});
    throw e;
  }
}

/**
 * Innermost message from Temporal's wrapped failure chain.
 *
 * A failure surfaces here as ActivityFailure -> ApplicationFailure -> cause,
 * so the outermost `message` is the useless "Activity task failed". The user
 * needs the specific one at the bottom.
 */
function rootMessage(e: unknown): string {
  let current: unknown = e;
  let best = e instanceof Error ? e.message : String(e);
  const seen = new Set<unknown>();

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const err = current as { message?: unknown; cause?: unknown };
    if (typeof err.message === 'string' && err.message.length > 0) {
      best = err.message;
    }
    current = err.cause;
  }
  return best;
}

/** Small deterministic hash, so replays pick the same creative angle. */
function hashToIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
