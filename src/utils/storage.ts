import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  solved: 'algopulse_solved',
  recalls: 'algopulse_recalls',
  attempts: 'algopulse_attempts',
  solvedAt: 'algopulse_solved_at',
};

export async function saveSolved(problemId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.solved);
  const set = new Set<string>(raw ? JSON.parse(raw) : []);
  set.add(problemId);
  await AsyncStorage.setItem(KEYS.solved, JSON.stringify(Array.from(set)));
}

export async function saveSolvedAt(problemId: string, date: Date): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.solvedAt);
  const map: Record<string, string> = raw ? JSON.parse(raw) : {};
  map[problemId] = date.toISOString();
  await AsyncStorage.setItem(KEYS.solvedAt, JSON.stringify(map));
}

export async function getSolved(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.solved);
  return raw ? JSON.parse(raw) : [];
}

export async function getSolvedAt(problemId: string): Promise<Date | null> {
  const raw = await AsyncStorage.getItem(KEYS.solvedAt);
  if (!raw) return null;
  const map: Record<string, string> = JSON.parse(raw);
  return map[problemId] ? new Date(map[problemId]) : null;
}

export async function getAllSolvedAt(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(KEYS.solvedAt);
  return raw ? JSON.parse(raw) : {};
}

export interface RecallItem {
  id: string; // problemId
  dueAt: string; // ISO
  completed?: boolean;
}

export async function upsertRecalls(items: RecallItem[]): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.recalls);
  const map: Record<string, RecallItem> = raw ? JSON.parse(raw) : {};
  for (const it of items) map[it.id + ':' + it.dueAt] = it;
  await AsyncStorage.setItem(KEYS.recalls, JSON.stringify(map));
}

export async function getRecalls(): Promise<Record<string, RecallItem>> {
  const raw = await AsyncStorage.getItem(KEYS.recalls);
  return raw ? JSON.parse(raw) : {};
}
