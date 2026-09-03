import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  agentReducer,
  initialAgentState,
  isFinished,
  type AgentRunState,
} from './agentReducer';
import type { AgentEvent } from '../../shared/agentEvents';

/** Applies a sequence of events starting from seq 1. */
function fold(events: AgentEvent[], from: AgentRunState = initialAgentState): AgentRunState {
  return events.reduce(
    (s, event, i) => agentReducer(s, { kind: 'event', event: { seq: i + 1, event } }),
    from
  );
}

describe('agentReducer', () => {
  it('accumulates token text in order', () => {
    const s = fold([
      { type: 'status', phase: 'generate', attempt: 1 },
      { type: 'token', text: 'Hello ' },
      { type: 'token', text: 'world' },
    ]);
    assert.equal(s.text, 'Hello world');
    assert.equal(s.status, 'streaming');
    assert.equal(s.lastSeq, 3);
  });

  it('tracks phases without repeating consecutive duplicates', () => {
    const s = fold([
      { type: 'status', phase: 'plan' },
      { type: 'status', phase: 'retrieve' },
      { type: 'status', phase: 'generate', attempt: 1 },
      { type: 'status', phase: 'generate', attempt: 1 },
    ]);
    assert.deepEqual(s.phaseHistory, ['plan', 'retrieve', 'generate']);
    assert.equal(s.phase, 'generate');
  });

  // Replay after a reconnect re-sends events the client already has. Without
  // this guard the token buffer would be duplicated on every reconnect.
  it('ignores an event at or below the high-water mark', () => {
    let s = fold([
      { type: 'status', phase: 'generate', attempt: 1 },
      { type: 'token', text: 'abc' },
    ]);
    assert.equal(s.text, 'abc');

    s = agentReducer(s, { kind: 'event', event: { seq: 2, event: { type: 'token', text: 'abc' } } });
    assert.equal(s.text, 'abc', 'duplicate seq must be a no-op');

    s = agentReducer(s, { kind: 'event', event: { seq: 1, event: { type: 'token', text: 'zzz' } } });
    assert.equal(s.text, 'abc', 'an older seq must be a no-op');
    assert.equal(s.lastSeq, 2);
  });

  it('is idempotent when the whole stream is replayed', () => {
    const events: AgentEvent[] = [
      { type: 'status', phase: 'plan' },
      { type: 'token', text: 'one ' },
      { type: 'token', text: 'two' },
      { type: 'done', problemId: 'p-1' },
    ];
    const once = fold(events);
    const twice = fold(events, once);
    assert.deepEqual(twice, once);
  });

  it('clears buffered text on reset but keeps the sequence cursor', () => {
    let s = fold([
      { type: 'status', phase: 'generate', attempt: 1 },
      { type: 'token', text: 'first attempt output' },
    ]);
    s = agentReducer(s, {
      kind: 'event',
      event: { seq: 3, event: { type: 'reset', attempt: 2, reason: 'repair' } },
    });

    assert.equal(s.text, '', 'text from a superseded generation must be dropped');
    assert.equal(s.attempt, 2);
    assert.equal(s.resets, 1);
    // The log stays append-only, so the cursor must not go backwards or the
    // next reconnect would replay everything again.
    assert.equal(s.lastSeq, 3);
  });

  it('surfaces validator errors during repair', () => {
    const s = fold([
      { type: 'status', phase: 'validate', attempt: 1 },
      {
        type: 'status',
        phase: 'repair',
        attempt: 1,
        errors: ['category must be exactly one of: Array, String, ...'],
      },
    ]);
    assert.equal(s.phase, 'repair');
    assert.equal(s.repairErrors.length, 1);
    assert.match(s.repairErrors[0]!, /category must be exactly one of/);
  });

  it('reaches done with a problem id', () => {
    const s = fold([
      { type: 'status', phase: 'persist' },
      { type: 'done', problemId: 'problem-42' },
    ]);
    assert.equal(s.status, 'done');
    assert.equal(s.problemId, 'problem-42');
    assert.equal(s.phase, null);
    assert.ok(isFinished(s));
  });

  it('reaches failed with a message', () => {
    const s = fold([{ type: 'error', message: 'validation failed after 3 attempts' }]);
    assert.equal(s.status, 'failed');
    assert.match(s.error!, /validation failed/);
    assert.ok(isFinished(s));
  });

  it('a dropped connection returns to connecting without losing progress', () => {
    let s = fold([
      { type: 'status', phase: 'generate', attempt: 1 },
      { type: 'token', text: 'partial output' },
    ]);
    s = agentReducer(s, { kind: 'disconnected' });

    assert.equal(s.status, 'connecting');
    assert.equal(s.text, 'partial output', 'text survives the reconnect');
    assert.equal(s.lastSeq, 2, 'cursor survives, so the resume asks for seq > 2');
  });

  it('a dropped connection after done does not reopen the run', () => {
    let s = fold([{ type: 'done', problemId: 'p-1' }]);
    s = agentReducer(s, { kind: 'disconnected' });
    assert.equal(s.status, 'done');
  });

  it('connecting preserves the cursor so reconnect resumes rather than restarts', () => {
    let s = fold([
      { type: 'status', phase: 'generate', attempt: 1 },
      { type: 'token', text: 'abc' },
    ]);
    s = agentReducer(s, { kind: 'connecting' });
    assert.equal(s.lastSeq, 2);
    assert.equal(s.text, 'abc');
    assert.equal(s.error, null);
  });

  it('reset-all clears everything for a fresh run', () => {
    const s = fold([{ type: 'token', text: 'x' }, { type: 'done', problemId: 'p' }]);
    assert.deepEqual(agentReducer(s, { kind: 'reset-all' }), initialAgentState);
  });

  it('survives a gap in the sequence without replaying the gap', () => {
    // The stream may legitimately skip ahead if the client resumed from a
    // Last-Event-ID; the cursor should jump, not rewind.
    let s = agentReducer(initialAgentState, {
      kind: 'event',
      event: { seq: 47, event: { type: 'token', text: 'resumed' } },
    });
    assert.equal(s.lastSeq, 47);
    assert.equal(s.text, 'resumed');
  });
});
