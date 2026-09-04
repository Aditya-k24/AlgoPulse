/**
 * Client for the agent endpoints.
 *
 * Uses expo/fetch rather than the global fetch. React Native's built-in fetch
 * is an XMLHttpRequest polyfill with no `response.body` at all, so streaming
 * over it is not awkward, it is impossible. expo/fetch is native-backed and
 * exposes a real ReadableStream.
 */
import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from '../lib/supabase';

const FUNCTIONS_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

export class NotAuthenticatedError extends Error {
  constructor() {
    super('You need to be signed in to generate a problem.');
    this.name = 'NotAuthenticatedError';
  }
}

export class DailyLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DailyLimitError';
  }
}

async function accessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new NotAuthenticatedError();
  return session.access_token;
}

export interface StartRunOptions {
  category?: string;
  difficulty?: string;
}

/**
 * Asks for a run and returns as soon as it is accepted — deliberately not
 * when it is finished. Typically well under a second regardless of how long
 * the agent will take.
 */
export async function startRun(options: StartRunOptions = {}): Promise<string> {
  const token = await accessToken();

  const response = await fetch(`${FUNCTIONS_BASE}/agent-run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category: options.category ?? null,
      difficulty: options.difficulty ?? null,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (response.status === 429) {
    throw new DailyLimitError(body.error ?? 'Daily generation limit reached.');
  }
  if (!response.ok) {
    throw new Error(body.error ?? `Could not start a run (HTTP ${response.status})`);
  }
  if (!body.runId) {
    throw new Error('Server accepted the run but returned no run id.');
  }

  return body.runId as string;
}

/**
 * Opens the event stream for a run.
 *
 * `lastEventId` is what makes a reconnect resume rather than replay from the
 * beginning — the server sends only events after it.
 */
export async function openRunStream(
  runId: string,
  lastEventId: number,
  signal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const token = await accessToken();

  const response = await expoFetch(`${FUNCTIONS_BASE}/agent-stream?runId=${runId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
      'Last-Event-ID': String(lastEventId),
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Could not open the stream (HTTP ${response.status})`);
  }
  if (!response.body) {
    // Would mean the global fetch shadowed expo/fetch — the one failure mode
    // worth naming explicitly, because the symptom is otherwise baffling.
    throw new Error('This build cannot stream responses. Check that expo/fetch is being used.');
  }

  return response.body;
}
