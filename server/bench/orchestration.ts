/**
 * Tier C — orchestration throughput.
 *
 * Reports two numbers, because they differ by several times and quoting the
 * larger one alone would be misleading:
 *
 *   starts/s       — StartWorkflowExecution, fire and forget. One RPC plus
 *                    one mutable-state write. Frontend bound.
 *   completions/s  — start to finish, including workflow tasks, an activity
 *                    task, and the history writes for all of it.
 *
 * Measures Temporal only: the bench workflow calls one trivial in-process
 * activity, so no OpenAI and no cross-internet Supabase writes are included.
 *
 *   npx tsx bench/orchestration.ts [total] [concurrency]
 */
import { Client, Connection } from '@temporalio/client';
import { Worker, NativeConnection } from '@temporalio/worker';
import { benchActivities, benchWorkflow, BENCH_TASK_QUEUE } from './benchWorkflow';

const ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const TOTAL = Number(process.argv[2] ?? 2000);
const CONCURRENCY = Number(process.argv[3] ?? 100);
const RUN_ID = Date.now();

async function main(): Promise<void> {
  const nativeConnection = await NativeConnection.connect({ address: ADDRESS });
  const worker = await Worker.create({
    connection: nativeConnection,
    namespace: 'default',
    taskQueue: BENCH_TASK_QUEUE,
    workflowsPath: require.resolve('./benchWorkflow'),
    activities: benchActivities,
    maxConcurrentActivityTaskExecutions: 200,
    maxConcurrentWorkflowTaskExecutions: 40,
    maxCachedWorkflows: 5000,
    maxConcurrentWorkflowTaskPolls: 20,
    maxConcurrentActivityTaskPolls: 20,
  });

  const client = new Client({
    connection: await Connection.connect({ address: ADDRESS }),
    namespace: 'default',
  });

  const results = await worker.runUntil(async () => {
    // ---- starts/s: fire and forget ----------------------------------------
    const startT0 = process.hrtime.bigint();
    let issued = 0;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (;;) {
          const n = issued++;
          if (n >= TOTAL) return;
          await client.workflow.start(benchWorkflow, {
            taskQueue: BENCH_TASK_QUEUE,
            workflowId: `bench-start-${RUN_ID}-${n}`,
            args: [n],
            workflowExecutionTimeout: '5 minutes',
          });
        }
      })
    );
    const startSecs = Number(process.hrtime.bigint() - startT0) / 1e9;

    // ---- completions/s: start to finish -----------------------------------
    const execT0 = process.hrtime.bigint();
    let dispatched = 0;
    let completed = 0;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (;;) {
          const n = dispatched++;
          if (n >= TOTAL) return;
          await client.workflow.execute(benchWorkflow, {
            taskQueue: BENCH_TASK_QUEUE,
            workflowId: `bench-exec-${RUN_ID}-${n}`,
            args: [n],
            workflowExecutionTimeout: '5 minutes',
          });
          completed++;
        }
      })
    );
    const execSecs = Number(process.hrtime.bigint() - execT0) / 1e9;

    return {
      tier: 'C — orchestration (Temporal only, no LLM, no remote DB)',
      total: TOTAL,
      concurrency: CONCURRENCY,
      historyShards: 512,
      workerProcesses: 1,
      starts: {
        seconds: Number(startSecs.toFixed(2)),
        perSecond: Math.round(TOTAL / startSecs),
      },
      completions: {
        seconds: Number(execSecs.toFixed(2)),
        perSecond: Math.round(completed / execSecs),
        completed,
      },
    };
  });

  console.log(JSON.stringify(results, null, 2));
  await nativeConnection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
