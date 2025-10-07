export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface ProblemPayload {
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  sample_input?: string;
  sample_output?: string;
  constraints?: string;
  solutions: { python: string; java: string; cpp: string };
  methods: string[];
}

export function validateProblemPayload(p: any): p is ProblemPayload {
  if (!p || typeof p !== 'object') return false;
  if (typeof p.title !== 'string') return false;
  if (typeof p.category !== 'string') return false;
  if (!['Easy','Medium','Hard'].includes(p.difficulty)) return false;
  if (typeof p.description !== 'string') return false;
  if (!p.solutions || typeof p.solutions !== 'object') return false;
  if (typeof p.solutions.python !== 'string') return false;
  if (typeof p.solutions.java !== 'string') return false;
  if (typeof p.solutions.cpp !== 'string') return false;
  if (!Array.isArray(p.methods)) return false;
  return true;
}
