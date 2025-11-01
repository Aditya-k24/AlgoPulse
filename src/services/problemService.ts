import { supabase } from '../lib/supabase';
import { Problem, Difficulty } from '../types';
import { validateProblemPayload } from '../ai/problemSchema';

export class ProblemService {
  static async generateProblem(
    category: string,
    difficulty: Difficulty,
    languages?: string[]
  ): Promise<Problem> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

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

    // Save to database
    const { data: savedProblem, error } = await supabase
      .from('problems')
      .insert(data.problem)
      .select()
      .single();

    if (error) {
      console.error('Error saving problem:', error);
      // Return the generated problem even if save fails
      return { ...data.problem, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
    }

    return savedProblem;
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

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (difficulty && difficulty !== 'All') {
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
}


