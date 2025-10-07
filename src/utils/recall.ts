export type Plan = 'baseline' | 'time_crunch';

const planIntervalsDays: Record<Plan, number[]> = {
  baseline: [1, 3, 7, 14, 30],
  time_crunch: [1, 2, 5, 10],
};

export function getRecallTimestamps(start: Date, plan: Plan): Date[] {
  const intervals = planIntervalsDays[plan];
  return intervals.map((d) => new Date(start.getTime() + d * 24 * 60 * 60 * 1000));
}

export function isDue(now: Date, dueAt: Date): boolean {
  return now.getTime() >= dueAt.getTime();
}
