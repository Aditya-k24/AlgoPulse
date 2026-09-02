/**
 * The agent run event contract.
 *
 * Imported by BOTH the Temporal worker (which writes these) and the React
 * Native client (which folds them into UI state), so the wire format cannot
 * drift between the two.
 *
 * Every event is persisted to agent_events with a monotonic `seq`, which is
 * what the SSE endpoint replays from on reconnect.
 */

/** Phases the workflow moves through, in order. */
export const PHASES = ['plan', 'retrieve', 'generate', 'validate', 'repair', 'persist'] as const;
export type Phase = (typeof PHASES)[number];

export interface StatusEvent {
  type: 'status';
  phase: Phase;
  /** 1-based generate attempt; present from the generate phase onward. */
  attempt?: number;
  /** Validator complaints, present on the repair phase. */
  errors?: string[];
}

export interface TokenEvent {
  type: 'token';
  /** A coalesced run of model output, not necessarily a single token. */
  text: string;
}

/**
 * Discard buffered tokens and start over.
 *
 * Emitted when an activity is re-executed — after a worker crash, or on a
 * repair attempt. The model produces different text each time, so resuming
 * mid-stream is meaningless; telling the client to reset is honest and cheap.
 */
export interface ResetEvent {
  type: 'reset';
  attempt: number;
  reason: 'retry' | 'repair';
}

export interface DoneEvent {
  type: 'done';
  problemId: string;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  errors?: string[];
}

export type AgentEvent = StatusEvent | TokenEvent | ResetEvent | DoneEvent | ErrorEvent;

/** An event as it comes back off the wire, carrying its replay cursor. */
export interface SequencedEvent {
  seq: number;
  event: AgentEvent;
}

export function isTerminal(e: AgentEvent): boolean {
  return e.type === 'done' || e.type === 'error';
}

/** Human-readable label for a phase, used by the client's progress list. */
export const PHASE_LABEL: Record<Phase, string> = {
  plan: 'Planning the problem',
  retrieve: 'Checking for near-duplicates',
  generate: 'Writing the problem',
  validate: 'Validating structure',
  repair: 'Repairing invalid output',
  persist: 'Saving',
};
