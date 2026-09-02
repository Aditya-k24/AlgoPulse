/**
 * The Temporal worker.
 *
 * Concurrency here is tuned for I/O, not CPU: activities wait on OpenAI and
 * on Postgres, so the ceiling is the model's rate limit and the connection
 * pool, not the ten cores on this machine.
 */
import { Worker, NativeConnection, Runtime } from '@temporalio/worker';
import * as activities from './activities';
import { config, TASK_QUEUE, assertLlmConfig } from './config';
import { closeDb } from './db';
import { logger, errField } from './logger';

const log = logger('worker');

async function main(): Promise<void> {
  assertLlmConfig();

  // Temporal installs handlers for SIGINT/SIGTERM by default and shuts down
  // GRACEFULLY, waiting for in-flight activities to finish. That is right for
  // production and useless for the crash demo, where the whole point is an
  // abrupt death — so demo with `kill -9`, not Ctrl-C.
  Runtime.install({});

  const connection = await NativeConnection.connect({ address: config.temporalAddress });

  const worker = await Worker.create({
    connection,
    namespace: config.temporalNamespace,
    taskQueue: TASK_QUEUE,
    workflowsPath: require.resolve('./workflows'),
    activities,

    maxConcurrentActivityTaskExecutions: 40,
    maxConcurrentWorkflowTaskExecutions: 20,
    // A sticky-cache miss forces a full history replay on the next workflow
    // task. Cheap in RAM, large effect on throughput.
    maxCachedWorkflows: 1000,
    maxConcurrentWorkflowTaskPolls: 10,
    maxConcurrentActivityTaskPolls: 10,
    // How long the server waits for THIS worker before handing its queued
    // workflow tasks back to the general pool. Lower than the 10s default so
    // a replacement worker picks up a dead one's work quickly.
    stickyQueueScheduleToStartTimeout: '5s',
    shutdownGraceTime: '10s',
  });

  log.info('worker ready', {
    taskQueue: TASK_QUEUE,
    temporal: config.temporalAddress,
    llmMode: config.llmMode,
    chaos: config.chaosInvalidPayload,
    pid: process.pid,
  });

  await worker.run();
  await closeDb();
}

main().catch((e) => {
  log.error('worker failed', { error: errField(e) });
  process.exit(1);
});
