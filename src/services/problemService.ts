import { supabase } from '../lib/supabase';
import { Problem, Difficulty } from '../models/Problem';
import { validateProblemPayload, ProblemPayload } from '../ai/problemSchema';

export class ProblemService {
  static async generateProblem(
    category?: string,
    difficulty?: Difficulty,
    languages?: string[]
  ): Promise<Problem> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const recentProblems = await this.getRecentProblemTitles(20);
    
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-problem`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category,
          difficulty,
          languages: languages || ['python', 'java', 'cpp'],
          existingTitles: recentProblems,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to generate problem: ${error}`);
    }

    const data = await response.json();
    
    if (!validateProblemPayload(data.problem)) {
      throw new Error('Invalid problem payload received');
    }

    const payload: ProblemPayload = data.problem;
    
    const existingProblem = await supabase
      .from('problems')
      .select('id, title')
      .eq('title', payload.title)
      .maybeSingle();
    
    if (existingProblem.data) {
      console.log(`Problem "${payload.title}" already exists. Fetching existing problem.`);
      const fetched = await this.getProblemById(existingProblem.data.id);
      if (fetched) return fetched;
    }
    
    const { data: savedProblem, error } = await supabase
      .from('problems')
      .insert({
        ...payload,
        sample_input: payload.sample_input || '',
        sample_output: payload.sample_output || '',
        constraints: payload.constraints || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving problem:', error);
      return { 
        ...payload, 
        sample_input: payload.sample_input || '',
        sample_output: payload.sample_output || '',
        constraints: payload.constraints || '',
        id: `temp_${Date.now()}`,
        created_at: new Date().toISOString(),
        solutions: payload.solutions
      } as Problem;
    }

    return savedProblem as Problem;
  }

  static async getProblems(
    category?: string,
    difficulty?: Difficulty,
    limit: number = 20,
    offset: number = 0
  ): Promise<Problem[]> {
    let query = supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch problems: ${error.message}`);
    }

    return data || [];
  }

  static async getProblemById(id: string): Promise<Problem | null> {
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Problem not found
      }
      throw new Error(`Failed to fetch problem: ${error.message}`);
    }

    return data;
  }

  static async getRandomProblem(
    category?: string,
    difficulty?: Difficulty
  ): Promise<Problem | null> {
    const problems = await this.getProblems(category, difficulty, 100);
    
    if (problems.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * problems.length);
    return problems[randomIndex];
  }

  static async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('problems')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const categories = [...new Set(data?.map(p => p.category) || [])];
    return categories.sort();
  }

  static async searchProblems(query: string): Promise<Problem[]> {
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to search problems: ${error.message}`);
    }

    return data || [];
  }

  static async getRecentProblemTitles(limit: number = 20): Promise<string[]> {
    const { data, error } = await supabase
      .from('problems')
      .select('title')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Failed to fetch recent problem titles:', error);
      return [];
    }

    return data?.map(p => p.title) || [];
  }
}


