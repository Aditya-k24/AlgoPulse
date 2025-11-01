export interface User {
  id: string;
  email: string;
  preferred_languages: string[];
  plan: 'baseline' | 'time_crunch';
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name?: string;
  avatar_url?: string;
  total_problems_solved: number;
  current_streak: number;
  longest_streak: number;
  favorite_categories: string[];
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_problems: number;
  problems_solved: number;
  accuracy_rate: number;
  average_time_per_problem: number;
  current_streak: number;
  longest_streak: number;
  category_stats: CategoryStats[];
}

export interface CategoryStats {
  category: string;
  total_problems: number;
  solved_problems: number;
  accuracy_rate: number;
  average_time: number;
}


