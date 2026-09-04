/**
 * GET /functions/v1/agent-stream?runId=<uuid>
 *
 * Server-sent events for one agent run: replay everything the caller has
 * missed, then follow the run to completion.
 *
 * Two design points worth knowing before reading the loop.
 *
 * 1. It tails the table rather than subscribing to Supabase Realtime.
 *    postgres_changes is documented at ~64 database changes per second,
 *    processed on a single thread to preserve ordering and re-authorized per
 *    subscriber, so the budget divides by subscriber count. At ~6 events per
 *    second per run that ceiling is reached around twenty concurrent runs,
 *    and the failure mode is silent loss. The read here is one indexed
 *    primary-key range scan against (run_id, seq) — the client still makes
 *    zero round trips and holds one push connection.
 *
 * 2. It retires itself before the platform kills it. Free-tier functions stop
 *    at 150s wall clock, and Supabase's own docs call out long SSE forwarding
 *    as a trigger for early shutdown. Rather than be cut off mid-frame, this
 *    closes cleanly at ~100s having sent a retry hint; the client reconnects
 *    with Last-Event-ID and replays from the append-only log, so the seam is
 *    invisible.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { authenticate, corsHeaders, isResponse, json, preflight } from '../_shared/http.ts';

/** Close well before the platform's 150s ceiling. */
const MAX_CONNECTION_MS = 100_000;
const POLL_INTERVAL_MS = 200;
const HEARTBEAT_MS = 15_000;
const PAGE_SIZE = 200;

interface EventRow {
  seq: number;
  type: string;
  data: Record<string, unknown>;
}

const TERMINAL = new Set(['done', 'error']);

function frame(row: EventRow): string {
  // A single data line: the payload is compact JSON with no raw newlines, so
  // it cannot accidentally terminate the frame.
  return `id: ${row.seq}\nevent: ${row.type}\ndata: ${JSON.stringify(row.data)}\n\n`;
}

serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'GET') {
    return json({ error: 'method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const runId = url.searchParams.get('runId');
  if (!runId) {
    return json({ error: 'runId query parameter is required' }, 400);
  }

  const caller = await authenticate(req);
  if (isResponse(caller)) return caller;
  const { client } = caller;

  // Resume point. The header is what a reconnect sends; the query parameter
  // is a convenience for clients that cannot set it.
  const resumeRaw = req.headers.get('last-event-id') ?? url.searchParams.get('after') ?? '0';
  const resumeFrom = Number.isFinite(Number(resumeRaw)) ? Number(resumeRaw) : 0;

  // RLS restricts agent_runs to the caller's own rows, so "no row" covers
  // both "does not exist" and "not yours" — and deliberately does not
  // distinguish them.
  const { data: run, error: runError } = await client
    .from('agent_runs')
    .select('id, status')
    .eq('id', runId)
    .maybeSingle();

  if (runError) {
    console.error('run lookup failed', runError);
    return json({ error: 'could not load run' }, 500);
  }
  if (!run) {
    return json({ error: 'run not found' }, 404);
  }

  let clientGone = false;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      let cursor = resumeFrom;
      let lastHeartbeat = Date.now();

      const send = (text: string) => {
        if (clientGone) return false;
        try {
          controller.enqueue(encoder.encode(text));
          return true;
        } catch {
          // The client hung up between our check and this write.
          clientGone = true;
          return false;
        }
      };

      // Tell the client how soon to come back after we retire ourselves.
      send('retry: 500\n\n');

      try {
        while (!clientGone) {
          const { data: rows, error } = await client
            .from('agent_events')
            .select('seq, type, data')
            .eq('run_id', runId)
            .gt('seq', cursor)
            .order('seq', { ascending: true })
            .limit(PAGE_SIZE);

          if (error) {
            console.error('tail query failed', error);
            send(`event: error\ndata: ${JSON.stringify({ message: 'stream read failed' })}\n\n`);
            break;
          }

          let sawTerminal = false;
          for (const row of (rows ?? []) as EventRow[]) {
            if (!send(frame(row))) break;
            cursor = row.seq;
            if (TERMINAL.has(row.type)) {
              sawTerminal = true;
              break;
            }
          }
          if (sawTerminal) break;

          // A full page means there is almost certainly more waiting, so skip
          // the sleep and keep draining.
          if ((rows?.length ?? 0) === PAGE_SIZE) continue;

          if (Date.now() - startedAt > MAX_CONNECTION_MS) {
            // Retire on our own terms. The comment is informational; the
            // client resumes from the last id it saw.
            send(`: retiring at ${Math.round((Date.now() - startedAt) / 1000)}s, reconnect to continue\n\n`);
            break;
          }

          if (Date.now() - lastHeartbeat > HEARTBEAT_MS) {
            // Keeps intermediaries from treating an idle stream as dead.
            send(': keep-alive\n\n');
            lastHeartbeat = Date.now();
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      } catch (e) {
        console.error('stream loop failed', e);
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting.
        }
      }
    },

    cancel() {
      // The client went away — stop querying on its behalf.
      clientGone = true;
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Defensive: stops any proxy that buffers by default from holding the
      // whole stream until completion, which would silently defeat streaming.
      'X-Accel-Buffering': 'no',
    },
  });
});
