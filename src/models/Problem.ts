export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Language = 'python' | 'java' | 'cpp' | 'javascript';

export interface Problem {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  sample_input: string;
  sample_output: string;
  constraints: string;
  solutions: Record<Language, string>;
  methods: string[];
  created_at: string;
  updated_at?: string;
}

export interface ProblemAttempt {
  id: string;
  user_id: string;
  problem_id: string;
  code: string;
  language: Language;
  verdict: 'pass' | 'fail';
  execution_time?: number;
  memory_usage?: number;
  submitted_at: string;
}

export interface ProblemRecall {
  id: string;
  user_id: string;
  problem_id: string;
  scheduled_for: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface ProblemFilter {
  category?: string;
  difficulty?: Difficulty;
  solved?: boolean;
  search?: string;
}

export interface ProblemGenerationRequest {
  category?: string;
  difficulty?: Difficulty;
  user_level?: 'beginner' | 'intermediate' | 'advanced';
  specific_topic?: string;
}


