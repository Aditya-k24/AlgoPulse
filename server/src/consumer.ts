/**
 * Kafka → Temporal.
 *
 * The only interesting thing this does is turn at-least-once delivery into
 * effectively-once work, by using the run id as the Temporal workflow id.
 */
import { Kafka, logLevel, Partitioners } from 'kafkajs';
import { Client, Connection } from '@temporalio/client';
import { generateProblemWorkflow } from './workflows';
import { config, TASK_QUEUE, TOPIC_RUNS_REQUESTED, TOPIC_RUNS_DLQ } from './config';
import { logger, errField } from './logger';

const log = logger('consumer');

interface RunMessage {
  runId: string;
  userId: string;
  kind?: string;
  category?: string | null;
  difficulty?: string | null;
}

async function main(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'algopulse-consumer',
    brokers: config.kafkaBrokers,
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 300, retries: 8 },
  });

  const consumer = kafka.consumer({
    groupId: 'agent-runner',
    sessionTimeout: 30_000,
    heartbeatInterval: 3_000,
    maxWaitTimeInMs: 100,
  });
  const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });

  const temporal = new Client({
    connection: await Connection.connect({ address: config.temporalAddress }),
    namespace: config.temporalNamespace,
  });

  await consumer.connect();
  await producer.connect();
  // fromBeginning matters only for a group with no committed offsets — a
  // fresh deployment. Starting at the end there would silently skip anything
  // already queued, which is the opposite of what this system promises.
  // Duplicates from replaying are already harmless: workflowId = runId.
  await consumer.subscribe({ topic: TOPIC_RUNS_REQUESTED, fromBeginning: true });

  log.info('consuming', { topic: TOPIC_RUNS_REQUESTED, group: 'agent-runner' });

  await consumer.run({
    // Manual commit: an offset becomes eligible only once its message has been
    // handed to Temporal (or parked in the DLQ).
    autoCommit: false,
    // eachBatch rather than eachMessage: eachMessage issues one OffsetCommit
    // RPC per message, which becomes the bottleneck at benchmark rates for no
    // gain, since every message here does the same tiny amount of work.
    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
      // Highest offset actually handed to Temporal (or parked in the DLQ).
      let lastHandled: string | undefined;

      for (const message of batch.messages) {
        // Skipping these is the classic eachBatch bug: without them a worker
        // keeps processing a partition it no longer owns after a rebalance.
        if (!isRunning() || isStale()) break;

        try {
          const payload = JSON.parse(message.value!.toString()) as RunMessage;

          await temporal.workflow.start(generateProblemWorkflow, {
            taskQueue: TASK_QUEUE,
            // The idempotency key. Temporal enforces at most one open
            // execution per workflowId per namespace as a server-side
            // uniqueness constraint, so a duplicate delivery costs one
            // rejected gRPC call and nothing else.
            workflowId: payload.runId,
            args: [{ runId: payload.runId, userId: payload.userId }],
            workflowExecutionTimeout: '30 minutes',
          });

          log.debug('started', { runId: payload.runId, offset: message.offset });
        } catch (e) {
          const already = String(e).includes('WorkflowExecutionAlreadyStarted');
          if (already) {
            // Exactly the duplicate the outbox is allowed to produce. Not an
            // error: the work is already in flight.
            log.debug('duplicate delivery ignored', { offset: message.offset });
          } else {
            // Poison message. Park it rather than blocking the partition
            // behind one bad row forever.
            log.error('parking message in dlq', {
              offset: message.offset,
              error: errField(e),
            });
            await producer.send({
              topic: TOPIC_RUNS_DLQ,
              messages: [
                {
                  key: message.key,
                  value: message.value,
                  headers: {
                    'x-error': errField(e),
                    'x-origin-topic': batch.topic,
                    'x-origin-partition': String(batch.partition),
                    'x-origin-offset': message.offset,
                  },
                },
              ],
            });
          }
        }

        resolveOffset(message.offset);
        lastHandled = message.offset;
        await heartbeat();
      }

      if (lastHandled !== undefined) {
        // Commit EXPLICITLY. With autoCommit disabled, kafkajs's
        // commitOffsetsIfNecessary() takes no action when called with no
        // arguments — it only honours autoCommit thresholds, which are off.
        // Leaving it at that meant this group never committed an offset at
        // all, so a restarted consumer resumed from the end of the log and
        // permanently skipped everything published while it was down. The
        // steady-state path hid it, because a consumer that never restarts
        // reads messages live and never consults a committed offset.
        //
        // Kafka commits the NEXT offset to read, hence +1.
        await consumer.commitOffsets([
          {
            topic: batch.topic,
            partition: batch.partition,
            offset: String(Number(lastHandled) + 1),
          },
        ]);
      }
    },
  });

  const shutdown = async (signal: string) => {
    log.info('shutting down', { signal });
    await consumer.disconnect().catch(() => {});
    await producer.disconnect().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  log.error('consumer failed to start', { error: errField(e) });
  process.exit(1);
});
