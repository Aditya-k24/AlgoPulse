/**
 * Environment, validated once at startup.
 *
 * Fail fast and loudly: a worker that boots with a missing broker address and
 * only discovers it on the first message is far harder to diagnose than one
 * that refuses to start.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// CommonJS: the Temporal worker bundles workflow code with webpack, and CJS is
// the path with no sharp edges there, so `__dirname` rather than import.meta.
const REPO_ROOT = resolve(__dirname, '../..');

/**
 * Loads the repo-root .env without adding a dotenv dependency.
 *
 * Deliberately does NOT override anything already in process.env, so a value
 * exported in the shell (or injected by the benchmark harness) wins.
 */
function loadDotEnv(path: string): void {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return; // absent is fine — real deployments use real env vars
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnv(resolve(REPO_ROOT, '.env'));

function required(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}. ${hint}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`env ${name} must be a number, got ${raw}`);
  return n;
}

export const TOPIC_RUNS_REQUESTED = 'agent.runs.requested';
export const TOPIC_RUNS_DLQ = 'agent.runs.dlq';
export const TASK_QUEUE = 'algopulse-agent';

export const config = {
  repoRoot: REPO_ROOT,

  /**
   * Session-mode pooler (port 5432), NOT the transaction pooler on 6543.
   * PgBouncer in transaction mode returns the connection to the pool at every
   * implicit commit, which silently drops LISTEN registrations — the relay
   * would appear to work while running only on its fallback sweep.
   */
  databaseUrl: required(
    'SUPABASE_DB_URL_SESSION',
    'Use the session-mode pooler on port 5432; LISTEN does not survive the transaction pooler on 6543.'
  ),

  /**
   * Transaction-mode pooler (port 6543) for ordinary queries and
   * transactions.
   *
   * The two pooler modes exist for different jobs and using session mode for
   * everything wastes the scarcer resource. Session mode pins a server
   * connection for the life of the client connection and this project is
   * capped at 15 of them; transaction mode returns the connection at each
   * commit and scales far higher.
   *
   * ONLY the relay's LISTEN registration genuinely needs a session, because
   * transaction mode drops it at every implicit commit. Everything else —
   * the worker's event writes, the persist transaction, the relay's own
   * SKIP LOCKED drain — is a discrete unit of work that transaction mode
   * handles correctly.
   *
   * Derived from the session URL by swapping the port, so there is one
   * credential to maintain rather than two that can drift.
   */
  get databasePoolUrl(): string {
    const override = process.env.SUPABASE_DB_URL_POOLED;
    if (override) return override;
    return this.databaseUrl.replace(/:5432(?=\/|$)/, ':6543');
  },

  kafkaBrokers: optional('KAFKA_BROKERS', 'localhost:29092').split(','),
  temporalAddress: optional('TEMPORAL_ADDRESS', 'localhost:7233'),
  temporalNamespace: optional('TEMPORAL_NAMESPACE', 'default'),

  /** 'live' calls OpenAI; 'stub' returns a canned valid payload so the
   *  throughput benchmarks measure our pipeline rather than OpenAI's rate
   *  limit — and cost nothing to run. */
  llmMode: optional('LLM_MODE', 'live') as 'live' | 'stub',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',

  /** Deliberately injects a schema-invalid completion to demo self-repair. */
  chaosInvalidPayload: process.env.CHAOS_INVALID_PAYLOAD === '1',

  /**
   * Connection budget.
   *
   * Supabase's session-mode pooler allows 15 clients TOTAL for this project.
   * The original settings claimed exactly that between them — worker pool 10,
   * relay pool 4, relay listener 1 — leaving nothing for psql, migrations or
   * a second worker, and any of those then failed with EMAXCONNSESSION.
   *
   * Headroom has to be generous rather than exact, because a SIGKILLed
   * process does not close its pooler sessions: they linger server-side until
   * Supavisor times them out. Measured six stale sessions still held 35
   * minutes after a chaos run. Since killing workers is a thing this system
   * is explicitly built to survive, the steady-state budget has to assume
   * some connections are stranded.
   *
   * Only the relay's listener now uses a session slot, so these pool sizes
   * apply to the transaction pooler and are no longer constrained by 15.
   */
  pool: {
    worker: int('WORKER_POOL_MAX', 10),
    relay: int('RELAY_POOL_MAX', 4),
  },

  relay: {
    batchSize: int('RELAY_BATCH_SIZE', 100),
    /** Safety net only. NOTIFY is fire-and-forget and is lost if nobody is
     *  listening at that instant (restart, blip, failover); this sweep is what
     *  makes the relay eventually-correct rather than best-effort. */
    sweepIntervalMs: int('RELAY_SWEEP_MS', 5000),
  },

  logLevel: optional('LOG_LEVEL', 'info'),
} as const;

export function assertLlmConfig(): void {
  if (config.llmMode === 'live' && !config.openaiApiKey) {
    throw new Error('LLM_MODE=live requires OPENAI_API_KEY. Set LLM_MODE=stub to run without it.');
  }
}
