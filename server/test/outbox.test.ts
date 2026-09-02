/**
 * Outbox relay behaviour, against a real Postgres.
 *
 * Every assertion here is about a guarantee the architecture depends on:
 * concurrent relays never publish the same row, a crash redelivers rather
 * than drops, and one batch insert wakes the relay once rather than N times.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Pool } from 'pg';
import { drainOnce, type OutboxRow } from '../src/outbox';
import { setupTestDb, seedOutbox, pendingCount, TEST_URL } from './helpers/testDb';

let pool: Pool;

before(async () => {
  pool = await setupTestDb();
});

after(async () => {
  await pool?.end();
});

beforeEach(async () => {
  await pool.query('delete from agent_runs');
});

describe('outbox drain', () => {
  it('publishes pending rows and marks them published', async () => {
    await seedOutbox(pool, 5);
    const published: OutboxRow[] = [];

    const n = await drainOnce(pool, async (rows) => {
      published.push(...rows);
    });

    assert.equal(n, 5);
    assert.equal(published.length, 5);
    assert.equal(await pendingCount(pool), 0);
  });

  it('returns 0 and publishes nothing when the outbox is empty', async () => {
    let called = false;
    const n = await drainOnce(pool, async () => {
      called = true;
    });
    assert.equal(n, 0);
    assert.equal(called, false, 'must not produce an empty batch to Kafka');
  });

  it('respects the batch size and drains the remainder on the next pass', async () => {
    await seedOutbox(pool, 7);

    const first = await drainOnce(pool, async () => {}, 3);
    assert.equal(first, 3);
    assert.equal(await pendingCount(pool), 4);

    const second = await drainOnce(pool, async () => {}, 3);
    assert.equal(second, 3);
    assert.equal(await pendingCount(pool), 1);
  });

  it('gives concurrent relays disjoint rows (FOR UPDATE SKIP LOCKED)', async () => {
    await seedOutbox(pool, 20);

    // Hold relay A inside its transaction, with its rows locked, until relay B
    // has run its claim query. Without SKIP LOCKED, B would block here and the
    // test would time out rather than fail.
    let releaseA: () => void = () => {};
    const aReachedPublish = new Promise<void>((r) => (releaseA = r));
    let aIsPublishing: () => void = () => {};
    const aIsHolding = new Promise<void>((r) => (aIsPublishing = r));

    const seenByA: string[] = [];
    const seenByB: string[] = [];

    const relayA = drainOnce(
      pool,
      async (rows) => {
        seenByA.push(...rows.map((r) => r.id));
        aIsPublishing();
        await aReachedPublish;
      },
      10
    );

    await aIsHolding;

    const relayB = drainOnce(
      pool,
      async (rows) => {
        seenByB.push(...rows.map((r) => r.id));
      },
      10
    );
    // B must complete while A still holds its locks.
    assert.equal(await relayB, 10, 'relay B was blocked by relay A');

    releaseA();
    assert.equal(await relayA, 10);

    assert.equal(seenByA.length, 10);
    assert.equal(seenByB.length, 10);
    const overlap = seenByA.filter((id) => seenByB.includes(id));
    assert.deepEqual(overlap, [], 'the same outbox row was claimed by both relays');
    assert.equal(new Set([...seenByA, ...seenByB]).size, 20);
    assert.equal(await pendingCount(pool), 0);
  });

  it('redelivers rather than drops when publish fails after the claim', async () => {
    await seedOutbox(pool, 4);

    await assert.rejects(
      () =>
        drainOnce(pool, async () => {
          // Stands in for the process dying between the Kafka produce and the
          // COMMIT. The transaction aborts, published_at stays null.
          throw new Error('kafka unreachable');
        }),
      /kafka unreachable/
    );

    assert.equal(await pendingCount(pool), 4, 'rows must remain claimable, never lost');

    // A later attempt picks them straight back up.
    const n = await drainOnce(pool, async () => {});
    assert.equal(n, 4);
    assert.equal(await pendingCount(pool), 0);
  });

  it('does not double-count attempts on a failed publish', async () => {
    await seedOutbox(pool, 2);
    await assert.rejects(() => drainOnce(pool, async () => { throw new Error('boom'); }));

    const { rows } = await pool.query<{ attempts: number }>('select attempts from agent_outbox');
    assert.deepEqual(
      rows.map((r) => r.attempts),
      [0, 0],
      'attempts is incremented in the success update, which rolled back'
    );
  });
});

describe('outbox NOTIFY trigger', () => {
  it('fires once per statement, not once per row', async () => {
    const listener = new Client({ connectionString: TEST_URL });
    await listener.connect();
    try {
      await listener.query('LISTEN agent_outbox');

      let notifications = 0;
      listener.on('notification', () => {
        notifications += 1;
      });

      // One statement inserting 50 rows.
      await seedOutbox(pool, 50);

      // Round-trip on the listening connection to guarantee any pending
      // notifications have been delivered before asserting.
      await listener.query('select 1');
      await new Promise((r) => setImmediate(r));

      assert.equal(
        notifications,
        1,
        'a row-level trigger would raise 50 notifications and hammer the relay'
      );
    } finally {
      await listener.end();
    }
  });
});
