/**
 * Transactional outbox → Kafka.
 *
 * The enqueue endpoint writes the run and its event in ONE Postgres
 * transaction, because "write the row and publish the event" across two
 * systems cannot be made atomic. This drains that outbox.
 *
 * The logic lives here, separate from relay.ts, so the claim/publish/mark
 * cycle can be driven by a test against a real Postgres without starting a
 * long-lived process.
 */
import type { Pool, PoolClient } from 'pg';
import { config, TOPIC_RUNS_REQUESTED } from './config';
import { logger, errField } from './logger';

const log = logger('outbox');

export interface OutboxRow {
  id: string; // bigint arrives as a string from pg
  run_id: string;
  topic: string;
  payload: unknown;
}

/**
 * FOR UPDATE SKIP LOCKED is the entire concurrency mechanism: a second relay
 * running this same query silently steps over the rows this one holds and
 * takes the next batch. No leases, no locked_until column, no clock skew.
 *
 * ORDER BY id before LIMIT keeps rough FIFO.
 */
const CLAIM_SQL = `
  with claimed as (
    select id
      from agent_outbox
     where published_at is null
     order by id
     limit $1
     for update skip locked
  )
  select o.id, o.run_id, o.topic, o.payload
    from agent_outbox o
    join claimed c on c.id = o.id
   order by o.id
`;

const MARK_SQL = `
  update agent_outbox
     set published_at = now(), attempts = attempts + 1
   where id = any($1::bigint[])
`;

/** What the relay does with a claimed batch. Injected so tests can substitute. */
export type Publish = (rows: OutboxRow[]) => Promise<void>;

/**
 * Claims up to `batchSize` pending rows, publishes them, and marks them
 * published — all inside one transaction.
 *
 * The row locks are deliberately held across the publish. That is what stops a
 * second relay from double-publishing the same row while this one is in
 * flight.
 *
 * Returns how many rows were drained, so the caller can keep going while
 * batches come back full.
 */
export async function drainOnce(
  pool: Pool,
  publish: Publish,
  batchSize = config.relay.batchSize
): Promise<number> {
  const db: PoolClient = await pool.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query<OutboxRow>(CLAIM_SQL, [batchSize]);

    if (rows.length === 0) {
      await db.query('COMMIT');
      return 0;
    }

    await publish(rows);

    await db.query(MARK_SQL, [rows.map((r) => r.id)]);
    await db.query('COMMIT');

    log.debug('drained', { count: rows.length });
    return rows.length;
  } catch (e) {
    // A crash between publish() and COMMIT leaves published_at null, so the
    // row is redelivered rather than lost. That duplicate is deliberate and
    // harmless: workflowId = runId makes Temporal reject the second start.
    // The alternative — marking published before producing — converts
    // duplicates into lost messages, which is strictly worse.
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    db.release();
  }
}

/**
 * Drains until the outbox is empty, coalescing a burst of NOTIFYs into one
 * pass. `running` guards against overlapping drains from concurrent wakeups.
 */
export function createDrainLoop(pool: Pool, publish: Publish) {
  let running = false;
  let again = false;

  return async function kick(): Promise<void> {
    if (running) {
      // A notify arrived mid-drain; make sure we sweep once more afterwards
      // rather than dropping it.
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        let drained: number;
        do {
          drained = await drainOnce(pool, publish);
        } while (drained === config.relay.batchSize);
      } while (again);
    } catch (e) {
      log.error('drain failed', { error: errField(e) });
    } finally {
      running = false;
    }
  };
}

export { TOPIC_RUNS_REQUESTED };
