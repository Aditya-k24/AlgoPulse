export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Plan = 'baseline' | 'time_crunch';
export type Language = 'python' | 'java' | 'cpp';

export interface Problem {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  sample_input?: string;
  sample_output?: string;
  constraints?: string;
  solutions: Record<Language, string>;
  methods: string[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  preferred_languages: Language[];
  plan: Plan;
}

export interface Attempt {
  id: string;
  user_id: string;
  problem_id: string;
  language: Language;
  verdict: 'pass' | 'fail' | 'partial';
  stdout?: string;
  stderr?: string;
  exec_ms?: number;
  mem_kb?: number;
  created_at: string;
}

export interface RecallItem {
  id: string;
  user_id: string;
  problem_id: string;
  due_at: string;
  completed: boolean;
  completed_at?: string;
}


