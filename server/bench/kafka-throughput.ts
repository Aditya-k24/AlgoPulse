/**
 * Tier B — broker throughput.
 *
 * The point of this tier is not to celebrate a big number. It is to establish
 * that Kafka is nowhere near being the bottleneck, so that when a later tier
 * is slower we know where to look.
 *
 *   npx tsx bench/kafka-throughput.ts [messageCount] [batchSize]
 */
import { Kafka, Partitioners } from 'kafkajs';

const BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:29092').split(',');
const TOPIC = 'agent.runs.bench';
const TOTAL = Number(process.argv[2] ?? 100_000);
const BATCH = Number(process.argv[3] ?? 500);

async function main(): Promise<void> {
  const kafka = new Kafka({ clientId: 'algopulse-bench', brokers: BROKERS });

  const admin = kafka.admin();
  await admin.connect();
  const topics = await admin.listTopics();
  if (!topics.includes(TOPIC)) {
    // Same partition count as the real topic so the numbers transfer.
    await admin.createTopics({
      topics: [{ topic: TOPIC, numPartitions: 8, replicationFactor: 1 }],
      waitForLeaders: true,
    });
  }
  await admin.disconnect();

  const producer = kafka.producer({
    idempotent: true,
    createPartitioner: Partitioners.DefaultPartitioner,
  });
  await producer.connect();

  // A payload the same shape and rough size as a real enqueue message, so the
  // number is not inflated by sending something trivially small.
  const sample = (n: number) =>
    JSON.stringify({
      runId: `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`,
      userId: '00000000-0000-0000-0000-000000000001',
      kind: 'generate_problem',
      category: 'Two Pointers',
      difficulty: 'Medium',
    });

  const bytes = Buffer.byteLength(sample(0));

  // Warm the connection and partition metadata so the first batch does not
  // pay for setup and drag the average down.
  await producer.send({ topic: TOPIC, messages: [{ key: 'warmup', value: sample(0) }] });

  const start = process.hrtime.bigint();
  for (let i = 0; i < TOTAL; i += BATCH) {
    const size = Math.min(BATCH, TOTAL - i);
    await producer.send({
      topic: TOPIC,
      messages: Array.from({ length: size }, (_, j) => ({
        key: `run-${i + j}`,
        value: sample(i + j),
      })),
    });
  }
  const seconds = Number(process.hrtime.bigint() - start) / 1e9;

  await producer.disconnect();

  const rate = TOTAL / seconds;
  console.log(
    JSON.stringify(
      {
        tier: 'B — broker throughput',
        messages: TOTAL,
        batchSize: BATCH,
        messageBytes: bytes,
        acks: 'all',
        idempotent: true,
        partitions: 8,
        seconds: Number(seconds.toFixed(2)),
        messagesPerSecond: Math.round(rate),
        megabytesPerSecond: Number(((rate * bytes) / 1_048_576).toFixed(2)),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
