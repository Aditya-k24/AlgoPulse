/**
 * Drives one agent run: start it, stream it, reconnect when the connection
 * drops, and stop when it reaches a terminal state.
 *
 * Reconnect is not an edge case here. Free-tier edge functions stop at 150s
 * wall clock and agent-stream retires itself at ~100s, so any run longer than
 * that WILL be resumed at least once. The append-only event log with a
 * monotonic seq is what makes that seam invisible.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createSSEParser, readSSE } from '../lib/sse';
import { agentReducer, initialAgentState, isFinished } from './agentReducer';
import { openRunStream, startRun, type StartRunOptions } from '../services/agentService';
import type { AgentEvent } from '../../shared/agentEvents';

/** Backoff between reconnect attempts, capped. */
const RECONNECT_BASE_MS = 400;
const RECONNECT_MAX_MS = 5_000;
const MAX_CONSECUTIVE_FAILURES = 6;

export function useAgentRun() {
  const [state, dispatch] = useReducer(agentReducer, initialAgentState);

  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  // The reducer's state is not readable from inside the async loop without
  // re-subscribing, so the resume cursor is mirrored here.
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  const consume = useCallback(async (runId: string) => {
    let failures = 0;

    while (!cancelledRef.current) {
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ kind: 'connecting' });

      let sawTerminal = false;

      try {
        const body = await openRunStream(runId, seqRef.current, controller.signal);
        // Seeded with the cursor so the parser reports the right id even
        // before the first framed event of this connection.
        const parser = createSSEParser(String(seqRef.current));

        for await (const frame of readSSE(body, parser)) {
          if (cancelledRef.current) break;
          failures = 0;

          const seq = Number(frame.id);
          if (!Number.isFinite(seq)) continue;

          let event: AgentEvent;
          try {
            event = { type: frame.event, ...JSON.parse(frame.data) } as AgentEvent;
          } catch {
            // A malformed frame must not kill a run that is otherwise fine.
            continue;
          }

          if (seq > seqRef.current) seqRef.current = seq;
          dispatch({ kind: 'event', event: { seq, event } });

          if (event.type === 'done' || event.type === 'error') {
            sawTerminal = true;
            break;
          }
        }
      } catch (e) {
        if (cancelledRef.current) return;
        failures += 1;
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          dispatch({
            kind: 'failed',
            message:
              e instanceof Error
                ? `Lost connection: ${e.message}`
                : 'Lost connection to the server.',
          });
          return;
        }
      }

      if (sawTerminal || cancelledRef.current) return;

      // The stream ended without a terminal event — either the function
      // retired itself at ~100s or the network dropped. Resume from the
      // cursor; the server replays only what comes after it.
      dispatch({ kind: 'disconnected' });
      const wait = Math.min(RECONNECT_BASE_MS * 2 ** failures, RECONNECT_MAX_MS);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }, []);

  const start = useCallback(
    async (options: StartRunOptions = {}) => {
      cancelledRef.current = false;
      seqRef.current = 0;
      dispatch({ kind: 'reset-all' });
      dispatch({ kind: 'connecting' });

      try {
        const runId = await startRun(options);
        await consume(runId);
      } catch (e) {
        dispatch({
          kind: 'failed',
          message: e instanceof Error ? e.message : 'Could not start the run.',
        });
      }
    },
    [consume]
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
  }, []);

  return {
    state,
    start,
    cancel,
    isRunning: state.status === 'connecting' || state.status === 'streaming',
    isFinished: isFinished(state),
  };
}
