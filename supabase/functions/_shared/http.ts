/**
 * Shared HTTP concerns for the agent endpoints.
 *
 * The two original functions (generate-problem, execute-code) have neither
 * CORS nor real authentication — they check only that the Authorization
 * header starts with "Bearer ", never decoding it. These do it properly.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, last-event-id, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface Caller {
  client: SupabaseClient;
  userId: string;
}

/**
 * Builds a Supabase client that acts AS THE CALLER.
 *
 * This is the important detail: the anon key plus the caller's own JWT means
 * every query runs under their RLS policies and `auth.uid()` resolves to them
 * inside SECURITY DEFINER functions. No service-role key exists anywhere in
 * this system, so there is no ambient authority to leak or misuse — the
 * database decides what the caller can see, not this code.
 */
export async function authenticate(req: Request): Promise<Caller | Response> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'missing bearer token' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error('SUPABASE_URL or SUPABASE_ANON_KEY not set');
    return json({ error: 'server misconfigured' }, 500);
  }

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Actually verifies the token against the auth server rather than trusting
  // its shape.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return json({ error: 'invalid or expired token' }, 401);
  }

  return { client, userId: data.user.id };
}

export function isResponse(v: unknown): v is Response {
  return v instanceof Response;
}
