/**
 * A minimal workflow used only by the orchestration benchmark.
 *
 * It calls one trivial activity and returns. That isolates Temporal's own
 * scheduling cost — task dispatch, history persistence, sticky cache — from
 * the cost of what our real activities do (OpenAI, and Supabase writes that
 * cross the internet). Mixing those into one number would measure the network
 * and call it orchestration.
 *
 * The real generateProblemWorkflow adds roughly a dozen more round trips on
 * top of whatever this measures.
 */
import { proxyActivities } from '@temporalio/workflow';

export interface BenchActivities {
  noop(n: number): Promise<number>;
}

const { noop } = proxyActivities<BenchActivities>({
  startToCloseTimeout: '10 seconds',
  retry: { maximumAttempts: 1 },
});

export async function benchWorkflow(n: number): Promise<number> {
  return noop(n);
}

export const benchActivities: BenchActivities = {
  async noop(n: number) {
    return n;
  },
};

export const BENCH_TASK_QUEUE = 'algopulse-bench';
