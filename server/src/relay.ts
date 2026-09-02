/**
 * The outbox relay process.
 *
 * Sleeps on LISTEN and wakes on NOTIFY — it does not poll. The periodic sweep
 * exists only because NOTIFY is fire-and-forget: a notification raised while
 * this process is restarting, or across a connection blip, is simply gone.
 * The sweep is what makes the relay eventually-correct rather than
 * best-effort.
 */
import { Client, Pool } from 'pg';
import { Kafka, Partitioners, type Producer } from 'kafkajs';
import { config, TOPIC_RUNS_REQUESTED } from './config';
import { createDrainLoop, type OutboxRow } from './outbox';
import { logger, errField } from './logger';

const log = logger('relay');

function makeProducer(): Producer {
  const kafka = new Kafka({
    clientId: 'algopulse-outbox-relay',
    brokers: config.kafkaBrokers,
    retry: { initialRetryTime: 300, retries: 8 },
  });
  return kafka.producer({
    // Guards against duplicates introduced by kafkajs's own internal retries.
    // It does NOT cover the crash-before-COMMIT case, which is handled by
    // idempotency downstream instead.
    idempotent: true,
    createPartitioner: Partitioners.DefaultPartitioner,
  });
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: config.databaseUrl, max: 4 });
  const producer = makeProducer();
  await producer.connect();
  log.info('kafka producer connected', { brokers: config.kafkaBrokers });

  const publish = async (rows: OutboxRow[]) => {
    await producer.send({
      topic: TOPIC_RUNS_REQUESTED,
      // Keyed by runId, not userId: ordering only matters per run, and there
      // is exactly one message per run, so this spreads evenly across all
      // partitions instead of hot-spotting on the busiest user.
      messages: rows.map((r) => ({
        key: r.run_id,
        value: JSON.stringify(r.payload),
      })),
    });
  };

  const kick = createDrainLoop(pool, publish);

  // A dedicated, long-lived connection — NOT one from the pool. A pooled
  // connection that gets released loses its LISTEN registration silently.
  const listener = new Client({ connectionString: config.databaseUrl });
  await listener.connect();
  await listener.query('LISTEN agent_outbox');
  log.info('listening', { channel: 'agent_outbox' });

  listener.on('notification', () => {
    void kick();
  });

  listener.on('error', (e) => {
    // Without a live listener the relay degrades to sweep-only, which looks
    // like it works but lags by seconds. Fail loudly instead.
    log.error('listener connection died', { error: errField(e) });
    process.exit(1);
  });

  const sweep = setInterval(() => {
    void kick();
  }, config.relay.sweepIntervalMs);

  // Catch anything enqueued while this process was down.
  await kick();

  const shutdown = async (signal: string) => {
    log.info('shutting down', { signal });
    clearInterval(sweep);
    await listener.end().catch(() => {});
    await producer.disconnect().catch(() => {});
    await pool.end().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  log.error('relay failed to start', { error: errField(e) });
  process.exit(1);
});
