/**
 * Folds agent run events into UI state.
 *
 * Kept pure and separate from the transport so every edge case — duplicate
 * delivery, out-of-order sequences, a reset mid-stream — is testable without
 * a network or a device. The hook owns the connection; this owns the meaning.
 */
import type { AgentEvent, Phase, SequencedEvent } from '../../shared/agentEvents';

export interface AgentRunState {
  status: 'idle' | 'connecting' | 'streaming' | 'done' | 'failed';
  /** Current phase, or null before the first status event. */
  phase: Phase | null;
  /** Phases in the order they were entered, for the progress list. */
  phaseHistory: Phase[];
  /** 1-based generate attempt. Above 1 means a repair happened. */
  attempt: number;
  /** Validator complaints from the most recent repair, for display. */
  repairErrors: string[];
  /** Accumulated model output. Cleared by a reset event. */
  text: string;
  /** How many times the stream restarted from scratch. */
  resets: number;
  problemId: string | null;
  error: string | null;
  /**
   * Highest sequence applied. Doubles as the Last-Event-ID for reconnect and
   * as the guard that makes replay idempotent.
   */
  lastSeq: number;
}

export const initialAgentState: AgentRunState = {
  status: 'idle',
  phase: null,
  phaseHistory: [],
  attempt: 1,
  repairErrors: [],
  text: '',
  resets: 0,
  problemId: null,
  error: null,
  lastSeq: 0,
};

export type AgentAction =
  | { kind: 'connecting' }
  | { kind: 'event'; event: SequencedEvent }
  | { kind: 'disconnected' }
  | { kind: 'failed'; message: string }
  | { kind: 'reset-all' };

export function agentReducer(state: AgentRunState, action: AgentAction): AgentRunState {
  switch (action.kind) {
    case 'reset-all':
      return initialAgentState;

    case 'connecting':
      // Preserve lastSeq: a reconnect must resume, not start over.
      return { ...state, status: 'connecting', error: null };

    case 'failed':
      return { ...state, status: 'failed', error: action.message };

    case 'disconnected':
      // Only meaningful mid-flight. A finished run stays finished.
      return state.status === 'streaming' || state.status === 'connecting'
        ? { ...state, status: 'connecting' }
        : state;

    case 'event':
      return applyEvent(state, action.event);
  }
}

function applyEvent(state: AgentRunState, { seq, event }: SequencedEvent): AgentRunState {
  // Replay and at-least-once delivery both mean the same event can arrive
  // twice. Anything at or below the high-water mark has already been folded
  // in, so dropping it is what makes reconnect safe.
  if (seq <= state.lastSeq) return state;

  const next: AgentRunState = { ...state, lastSeq: seq, status: 'streaming' };
  return reduceEvent(next, event);
}

function reduceEvent(state: AgentRunState, event: AgentEvent): AgentRunState {
  switch (event.type) {
    case 'status': {
      const phaseHistory =
        state.phaseHistory[state.phaseHistory.length - 1] === event.phase
          ? state.phaseHistory
          : [...state.phaseHistory, event.phase];

      return {
        ...state,
        phase: event.phase,
        phaseHistory,
        attempt: event.attempt ?? state.attempt,
        // Repair errors persist only while the repair phase is on screen.
        repairErrors: event.phase === 'repair' ? event.errors ?? [] : state.repairErrors,
      };
    }

    case 'token':
      return { ...state, text: state.text + event.text };

    case 'reset':
      // The activity re-ran, so the buffered text is from a generation that
      // no longer exists. Keep lastSeq — the event log is still append-only.
      return { ...state, text: '', attempt: event.attempt, resets: state.resets + 1 };

    case 'done':
      return { ...state, status: 'done', problemId: event.problemId, phase: null };

    case 'error':
      return {
        ...state,
        status: 'failed',
        error: event.message,
        repairErrors: event.errors ?? state.repairErrors,
      };
  }
}

/** True once the run has reached a terminal state and the stream may close. */
export function isFinished(state: AgentRunState): boolean {
  return state.status === 'done' || state.status === 'failed';
}
