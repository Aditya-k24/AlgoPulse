import { supabase } from '../lib/supabase';
import { Problem, Difficulty } from '../models/Problem';
import type { Approach, Reference } from '../models/ReviewContent';
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
      let errorMessage = 'Failed to generate problem';
      try {
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorText;
          } catch {
            errorMessage = errorText || `HTTP ${response.status}`;
          }
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data || !data.problem) {
      console.error('Response missing problem:', data);
      throw new Error('Invalid response: missing problem data');
    }
    
    if (!validateProblemPayload(data.problem)) {
      console.error('Validation failed for payload:', JSON.stringify(data.problem, null, 2));
      throw new Error('Invalid problem payload received. Check console for details.');
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
    
    // Add IDs to test cases
    const testCasesWithIds = payload.test_cases?.map((tc, index) => ({
      ...tc,
      id: `test-${index + 1}`,
    })) || [];

    // Ensure methods are max 3 words each
    const trimMethods = (methods: string[]): string[] => {
      return methods.map(method => {
        const words = method.trim().split(/\s+/);
        return words.slice(0, 3).join(' ');
      });
    };

    const trimmedMethods = payload.methods ? trimMethods(payload.methods) : [];
    
    // Extract fields that should NOT go to problems table
    // approaches, references, quick_refresh, pattern_name, visual_breakdown go to separate tables
    const { approaches, references, quick_refresh, pattern_name, visual_breakdown, ...problemFields } = payload as any;
    
    const { data: savedProblem, error } = await supabase
      .from('problems')
      .insert({
        ...problemFields,
        methods: trimmedMethods,
        sample_input: payload.sample_input || '',
        sample_output: payload.sample_output || '',
        constraints: payload.constraints || '',
        test_cases: testCasesWithIds.length > 0 ? testCasesWithIds : undefined,
        // Save review mode fields to problems table
        quick_refresh: quick_refresh || [],
        pattern_name: pattern_name || '',
        visual_breakdown: visual_breakdown || '',
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

    // Save review content (approaches and references) to separate tables
    if (savedProblem && savedProblem.id) {
      try {
        const { ReviewContentService } = await import('./reviewContentService');

        // Convert approaches to ReviewContent format
        const reviewApproaches: Approach[] = (approaches || []).map((a: any, index: number) => ({
          name: a.name || `Approach ${index + 1}`,
          type: a.type || 'optimal',
          whenToUse: a.when_to_use || '',
          coreIntuition: a.core_intuition || '',
          steps: Array.isArray(a.steps) ? a.steps : [],
          timeComplexity: a.time_complexity || 'O(n)',
          spaceComplexity: a.space_complexity || 'O(1)',
          pitfalls: a.pitfalls || undefined,
          displayOrder: index,
        }));

        // Convert references to ReviewContent format
        const reviewReferences: Reference[] = (references || []).map((r: any, index: number) => ({
          type: (r.type || 'video') as 'video' | 'article',
          title: r.title || '',
          url: r.url || '',
          author: r.author || undefined,
          displayOrder: index,
        }));

        // Save review content
        await ReviewContentService.saveReviewContent({
          problemId: savedProblem.id,
          quickRefresh: quick_refresh || [],
          patternName: pattern_name || '',
          approaches: reviewApproaches,
          visualBreakdown: visual_breakdown || '',
          references: reviewReferences,
        });
      } catch (reviewError) {
        console.error('Error saving review content:', reviewError);
        // Don't fail the whole operation if review content save fails
      }
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


