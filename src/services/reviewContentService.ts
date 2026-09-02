/**
 * Service for managing review content (explanations, references, etc.)
 */

import { supabase } from '../lib/supabase';
import { Approach, Reference, ReviewContent, AIPracticeProblem } from '../models/ReviewContent';

export class ReviewContentService {
  /**
   * Get review content for a problem
   */
  static async getReviewContent(problemId: string): Promise<ReviewContent | null> {
    try {
      // Check if problemId is a valid UUID (not a temp ID or simple number)
      if (!problemId || problemId.startsWith('temp_') || /^\d+$/.test(problemId)) {
        return null;
      }

      // Get problem with additional fields
      const { data: problem, error: problemError } = await supabase
        .from('problems')
        .select('id, quick_refresh, pattern_name, visual_breakdown')
        .eq('id', problemId)
        .single();

      if (problemError) throw problemError;

      // Get approaches
      const { data: approaches, error: approachesError } = await supabase
        .from('problem_explanations')
        .select('*')
        .eq('problem_id', problemId)
        .order('display_order', { ascending: true });

      if (approachesError) throw approachesError;

      // Get references
      const { data: references, error: referencesError } = await supabase
        .from('problem_references')
        .select('*')
        .eq('problem_id', problemId)
        .order('display_order', { ascending: true });

      if (referencesError) throw referencesError;

      return {
        problemId,
        quickRefresh: problem.quick_refresh || [],
        patternName: problem.pattern_name,
        approaches: (approaches || []).map(a => ({
          id: a.id,
          name: a.approach_name,
          type: a.approach_type,
          whenToUse: a.when_to_use,
          coreIntuition: a.core_intuition,
          steps: a.steps,
          timeComplexity: a.time_complexity,
          spaceComplexity: a.space_complexity,
          pitfalls: a.pitfalls,
          displayOrder: a.display_order,
        })),
        visualBreakdown: problem.visual_breakdown,
        references: (references || []).map(r => ({
          id: r.id,
          type: r.reference_type,
          title: r.title,
          url: r.url,
          author: r.author,
          displayOrder: r.display_order,
        })),
      };
    } catch (error) {
      console.error('Error getting review content:', error);
      return null;
    }
  }

  /**
   * Save review content for a problem
   */
  static async saveReviewContent(content: ReviewContent): Promise<boolean> {
    try {
      // Update problem fields
      const { error: problemError } = await supabase
        .from('problems')
        .update({
          quick_refresh: content.quickRefresh,
          pattern_name: content.patternName,
          visual_breakdown: content.visualBreakdown,
        })
        .eq('id', content.problemId);

      if (problemError) throw problemError;

      // Delete existing approaches and references
      await supabase.from('problem_explanations').delete().eq('problem_id', content.problemId);
      await supabase.from('problem_references').delete().eq('problem_id', content.problemId);

      // Insert approaches
      if (content.approaches.length > 0) {
        const { error: approachesError } = await supabase
          .from('problem_explanations')
          .insert(
            content.approaches.map((a, index) => ({
              problem_id: content.problemId,
              approach_name: a.name,
              approach_type: a.type,
              when_to_use: a.whenToUse,
              core_intuition: a.coreIntuition,
              steps: a.steps,
              time_complexity: a.timeComplexity,
              space_complexity: a.spaceComplexity,
              pitfalls: a.pitfalls,
              display_order: a.displayOrder ?? index,
            }))
          );

        if (approachesError) throw approachesError;
      }

      // Insert references
      if (content.references.length > 0) {
        const { error: referencesError } = await supabase
          .from('problem_references')
          .insert(
            content.references.map((r, index) => ({
              problem_id: content.problemId,
              reference_type: r.type,
              title: r.title,
              url: r.url,
              author: r.author,
              display_order: r.displayOrder ?? index,
            }))
          );

        if (referencesError) throw referencesError;
      }

      return true;
    } catch (error) {
      console.error('Error saving review content:', error);
      return false;
    }
  }

  /**
   * Generate AI practice problem
   */
  static async generatePracticeProblem(
    userId: string,
    concept: string,
    difficulty: 'Easy' | 'Medium' | 'Hard',
    parentProblemId?: string
  ): Promise<AIPracticeProblem | null> {
    try {
      // TODO: Call Edge Function to generate problem using OpenAI
      // For now, return mock data
      
      const problem: AIPracticeProblem = {
        id: crypto.randomUUID(),
        userId,
        parentProblemId,
        concept,
        difficulty,
        problemStatement: `[AI Generated] A ${difficulty} problem about ${concept}`,
        hints: [
          'Think about the pattern used in similar problems',
          'Consider edge cases',
          'Analyze time complexity requirements'
        ],
        expectedTimeComplexity: 'O(n)',
        expectedSpaceComplexity: 'O(1)',
        createdAt: new Date(),
      };

      // Save to database
      const { data, error } = await supabase
        .from('ai_generated_problems')
        .insert({
          user_id: userId,
          parent_problem_id: parentProblemId,
          concept,
          difficulty,
          problem_statement: problem.problemStatement,
          hints: problem.hints,
          expected_time_complexity: problem.expectedTimeComplexity,
          expected_space_complexity: problem.expectedSpaceComplexity,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...problem,
        id: data.id,
      };
    } catch (error) {
      console.error('Error generating practice problem:', error);
      throw error;
    }
  }

  /**
   * Get user's AI generated problems
   */
  static async getUserAIProblems(userId: string, concept?: string): Promise<AIPracticeProblem[]> {
    try {
      let query = supabase
        .from('ai_generated_problems')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (concept) {
        query = query.eq('concept', concept);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        parentProblemId: d.parent_problem_id,
        concept: d.concept,
        difficulty: d.difficulty,
        problemStatement: d.problem_statement,
        hints: d.hints || [],
        expectedTimeComplexity: d.expected_time_complexity,
        expectedSpaceComplexity: d.expected_space_complexity,
        sampleInput: d.sample_input,
        sampleOutput: d.sample_output,
        createdAt: new Date(d.created_at),
      }));
    } catch (error) {
      console.error('Error getting AI problems:', error);
      return [];
    }
  }

  /**
   * Get concept stats for user
   */
  static async getConceptStats(userId: string, concept?: string) {
    try {
      let query = supabase
        .from('concept_stats')
        .select('*')
        .eq('user_id', userId);

      if (concept) {
        query = query.eq('concept', concept);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting concept stats:', error);
      return [];
    }
  }
}

