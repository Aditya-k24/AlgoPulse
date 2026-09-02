/**
 * Workflow behaviour under time skipping.
 *
 * TestWorkflowEnvironment advances its clock whenever every workflow is
 * blocked on a timer, so a 2s-then-4s retry backoff is asserted in
 * milliseconds of real time. The catch: mocked activities must resolve
 * without real timers, or the clock has something to wait for and stops
 * skipping.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { ApplicationFailure } from '@temporalio/common';
import { generateProblemWorkflow, MAX_REPAIRS } from '../src/workflows';
import type * as activities from '../src/activities';

let env: TestWorkflowEnvironment;

before(async () => {
  env = await TestWorkflowEnvironment.createTimeSkipping();
});

after(async () => {
  await env?.teardown();
});

type Acts = typeof activities;

/** Flattens Temporal's nested failure chain into one searchable string. */
function causeChain(e: unknown): string {
  const parts: string[] = [];
  let current: unknown = e;
  const seen = new Set<unknown>();
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const err = current as { message?: unknown; type?: unknown; cause?: unknown };
    if (typeof err.type === 'string') parts.push(err.type);
    if (typeof err.message === 'string') parts.push(err.message);
    current = err.cause;
  }
  return parts.join(' | ');
}

/** Baseline mocks; each test overrides only what it is about. */
function baseActivities(overrides: Partial<Acts> = {}): Partial<Acts> {
  return {
    emit: async () => {},
    emitPhase: async () => {},
    markFailed: async () => {},
    plan: async () => ({
      category: 'Two Pointers',
      difficulty: 'Easy',
      creativeHint: 'a logistics framing',
      userId: 'user-1',
    }),
    retrieveSimilar: async () => [],
    generate: async () => '{"ok":true}',
    validateOutput: async () => ({ ok: true, errors: [] }),
    persist: async () => ({ problemId: 'problem-1' }),
    ...overrides,
  };
}

async function run(acts: Partial<Acts>, workflowId: string) {
  const worker = await Worker.create({
    connection: env.nativeConnection,
    taskQueue: 'test',
    workflowsPath: require.resolve('../src/workflows'),
    activities: acts,
  });

  return worker.runUntil(
    env.client.workflow.execute(generateProblemWorkflow, {
      taskQueue: 'test',
      workflowId,
      args: [{ runId: workflowId, userId: 'user-1' }],
    })
  );
}

describe('generateProblemWorkflow', () => {
  it('persists on the first attempt when validation passes', async () => {
    let persisted = 0;
    let generated = 0;

    const out = await run(
      baseActivities({
        generate: async () => {
          generated += 1;
          return '{"ok":true}';
        },
        persist: async () => {
          persisted += 1;
          return { problemId: 'problem-1' };
        },
      }),
      'wf-happy'
    );

    assert.equal(out.problemId, 'problem-1');
    assert.equal(out.attempts, 1);
    assert.equal(generated, 1);
    assert.equal(persisted, 1);
  });

  // Regression: the workflow originally emitted the 'persist' phase twice and
  // never emitted 'done', so the client had no terminal event — the stream
  // would just stop and no problemId ever reached the device.
  it('emits exactly one terminal done event carrying the problemId', async () => {
    const events: { type: string; problemId?: string }[] = [];
    const phases: string[] = [];

    await run(
      baseActivities({
        emit: async (_runId: string, event: { type: string; problemId?: string }) => {
          events.push(event);
        },
        emitPhase: async (_runId: string, phase: string) => {
          phases.push(phase);
        },
      }),
      'wf-done-event'
    );

    const done = events.filter((e) => e.type === 'done');
    assert.equal(done.length, 1, 'exactly one done event');
    assert.equal(done[0]!.problemId, 'problem-1');
    assert.equal(
      phases.filter((p) => p === 'persist').length,
      1,
      'persist phase must be announced once, not twice'
    );
    assert.deepEqual(phases, ['plan', 'retrieve', 'generate', 'validate', 'persist']);
  });

  it('feeds validator errors into the next prompt and succeeds on repair', async () => {
    const notesSeen: (string | undefined)[] = [];
    let call = 0;

    const out = await run(
      baseActivities({
        generate: async (input) => {
          notesSeen.push(input.repairNote);
          call += 1;
          return `raw-${call}`;
        },
        validateOutput: async () =>
          call < 3
            ? {
                ok: false,
                errors: ['category must be exactly one of: Array, String, ...'],
                repairNote: 'FIX: category must be exactly one of: Array, String, ...',
              }
            : { ok: true, errors: [] },
      }),
      'wf-repair'
    );

    assert.equal(out.attempts, 3);
    assert.equal(notesSeen.length, 3);
    assert.equal(notesSeen[0], undefined, 'first attempt carries no repair note');
    assert.match(notesSeen[1]!, /category must be exactly one of/);
    assert.match(notesSeen[2]!, /category must be exactly one of/);
  });

  it('gives up after the repair bound and never persists', async () => {
    let persisted = 0;
    let generated = 0;

    await assert.rejects(
      () =>
        run(
          baseActivities({
            generate: async () => {
              generated += 1;
              return 'always-bad';
            },
            validateOutput: async () => ({
              ok: false,
              errors: ['approaches must contain 2-3 entries (got 1)'],
              repairNote: 'FIX approaches',
            }),
            persist: async () => {
              persisted += 1;
              return { problemId: 'never' };
            },
          }),
          'wf-exhausted'
        ),
      (e: unknown) => {
        // Temporal wraps: WorkflowFailedError -> ApplicationFailure. The type
        // we care about is down the cause chain, not on the outer error.
        assert.match(causeChain(e), /ValidationExhausted|validation failed after/);
        return true;
      }
    );

    assert.equal(generated, MAX_REPAIRS + 1, 'bounded at 1 generation plus MAX_REPAIRS');
    assert.equal(persisted, 0, 'invalid output must never reach the database');
  });

  it('retries a transport failure with identical input, then succeeds', async () => {
    let attempts = 0;

    const out = await run(
      baseActivities({
        generate: async () => {
          attempts += 1;
          if (attempts < 3) throw new Error('socket hang up');
          return '{"ok":true}';
        },
      }),
      'wf-transport-retry'
    );

    // Three activity attempts, but still the FIRST logical generation — the
    // workflow loop never advanced, because this is transport failure, not
    // semantic failure.
    assert.equal(attempts, 3);
    assert.equal(out.attempts, 1);
    assert.equal(out.problemId, 'problem-1');
  });

  it('does not retry an error listed in nonRetryableErrorTypes', async () => {
    let attempts = 0;

    await assert.rejects(() =>
      run(
        baseActivities({
          generate: async () => {
            attempts += 1;
            throw ApplicationFailure.nonRetryable('model returned no content', 'EmptyCompletion');
          },
        }),
        'wf-nonretryable'
      )
    );

    assert.equal(attempts, 1, 'EmptyCompletion must be attempted exactly once');
  });

  it('marks the run failed so the client sees an error rather than silence', async () => {
    const failures: string[] = [];

    await assert.rejects(() =>
      run(
        baseActivities({
          plan: async () => {
            throw ApplicationFailure.nonRetryable('no such run', 'UnknownRun');
          },
          markFailed: async (_runId: string, message: string) => {
            failures.push(message);
          },
        }),
        'wf-marks-failed'
      )
    );

    assert.equal(failures.length, 1);
    assert.match(failures[0]!, /no such run/);
  });
});
