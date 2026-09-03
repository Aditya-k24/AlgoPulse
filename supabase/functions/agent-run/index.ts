/**
 * POST /functions/v1/agent-run
 *
 * Accepts a generation request and returns immediately. All it does is call
 * one RPC, because that RPC writes the run and its outbox event in a single
 * transaction — the atomicity that makes the whole pipeline safe lives in the
 * database, not here.
 *
 * Response time is deliberately independent of how long the agent takes.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { authenticate, isResponse, json, preflight } from '../_shared/http.ts';

interface RunRequest {
  category?: string | null;
  difficulty?: string | null;
}

serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const caller = await authenticate(req);
  if (isResponse(caller)) return caller;

  let body: RunRequest = {};
  if (req.headers.get('content-length') !== '0') {
    try {
      body = (await req.json()) as RunRequest;
    } catch {
      return json({ error: 'body must be valid JSON' }, 400);
    }
  }

  // The RPC takes user_id from auth.uid() internally, so a caller cannot
  // enqueue on someone else's behalf even by lying in the body. It also
  // enforces the per-user daily cap that bounds LLM spend, in SQL, before any
  // work is scheduled.
  const { data, error } = await caller.client.rpc('enqueue_agent_run', {
    p_category: body.category ?? null,
    p_difficulty: body.difficulty ?? null,
    p_kind: 'generate_problem',
  });

  if (error) {
    // 53400 is configuration_limit_exceeded, raised by the daily cap.
    if (error.code === '53400') {
      return json({ error: error.message, code: 'daily_limit_reached' }, 429);
    }
    console.error('enqueue failed', error);
    return json({ error: 'could not enqueue run', detail: error.message }, 500);
  }

  return json({ runId: data }, 202);
});
