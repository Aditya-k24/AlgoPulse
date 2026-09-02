/**
 * Creates the topics explicitly. Auto-creation is disabled in compose on
 * purpose: topics are infrastructure with partition counts and retention that
 * should be deliberate, not whatever a first produce happened to imply.
 */
import { Kafka } from 'kafkajs';
import { config, TOPIC_RUNS_REQUESTED, TOPIC_RUNS_DLQ } from '../config';
import { logger, errField } from '../logger';

const log = logger('topics');

async function main(): Promise<void> {
  const kafka = new Kafka({ clientId: 'algopulse-admin', brokers: config.kafkaBrokers });
  const admin = kafka.admin();
  await admin.connect();

  const existing = await admin.listTopics();

  const wanted = [
    {
      topic: TOPIC_RUNS_REQUESTED,
      // Partition count is the hard ceiling on consumer parallelism within a
      // group, and raising it later breaks key→partition affinity. Start at
      // the number we would want: 8 leaves headroom on a 10-core box.
      numPartitions: 8,
      replicationFactor: 1,
      configEntries: [{ name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }],
    },
    {
      topic: TOPIC_RUNS_DLQ,
      // Ordering is irrelevant and volume is ~0, and one partition makes
      // `kafka-console-consumer --from-beginning` actually readable.
      numPartitions: 1,
      replicationFactor: 1,
      configEntries: [{ name: 'retention.ms', value: String(30 * 24 * 60 * 60 * 1000) }],
    },
  ].filter((t) => !existing.includes(t.topic));

  if (wanted.length === 0) {
    log.info('topics already present', { topics: existing.filter((t) => t.startsWith('agent.')) });
  } else {
    await admin.createTopics({ topics: wanted, waitForLeaders: true });
    log.info('created', { topics: wanted.map((t) => t.topic) });
  }

  await admin.disconnect();
}

main().catch((e) => {
  log.error('failed', { error: errField(e) });
  process.exit(1);
});
