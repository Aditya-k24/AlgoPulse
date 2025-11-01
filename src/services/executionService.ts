import { supabase } from '../lib/supabase';
import { Language } from '../types';

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTime?: number;
  memoryUsage?: number;
  verdict: 'pass' | 'fail' | 'error';
}

export class ExecutionService {
  static async executeCode(
    code: string,
    language: Language,
    input?: string,
    expectedOutput?: string
  ): Promise<ExecutionResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/execute-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            language: language === 'python' ? 'python3' : language,
            code,
            stdin: input || '',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Execution failed: ${error}`);
      }

      const result = await response.json();
      
      // Determine verdict
      let verdict: 'pass' | 'fail' | 'error' = 'fail';
      
      if (result.error) {
        verdict = 'error';
      } else if (expectedOutput && result.output?.trim() === expectedOutput.trim()) {
        verdict = 'pass';
      } else if (!expectedOutput && result.output) {
        verdict = 'fail'; // No expected output to compare
      }

      return {
        output: result.output || '',
        error: result.error || undefined,
        executionTime: result.cpuTime || undefined,
        memoryUsage: result.memory || undefined,
        verdict,
      };
    } catch (error: any) {
      return {
        output: '',
        error: error.message,
        verdict: 'error',
      };
    }
  }

  static async submitSolution(
    problemId: string,
    code: string,
    language: Language,
    input?: string,
    expectedOutput?: string
  ): Promise<{ result: ExecutionResult; attemptId?: string }> {
    const result = await this.executeCode(code, language, input, expectedOutput);
    
    // Save attempt to database
    let attemptId: string | undefined;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('attempts')
          .insert({
            user_id: user.id,
            problem_id: problemId,
            language,
            verdict: result.verdict,
            stdout: result.output,
            stderr: result.error,
            exec_ms: result.executionTime,
            mem_kb: result.memoryUsage,
          })
          .select()
          .single();

        if (!error && data) {
          attemptId = data.id;
        }
      }
    } catch (error) {
      console.error('Error saving attempt:', error);
    }

    return { result, attemptId };
  }

  static async getAttemptHistory(problemId: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attempt history:', error);
      return [];
    }

    return data || [];
  }

  static async getUserStats(): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    successRate: number;
    averageExecutionTime: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        successRate: 0,
        averageExecutionTime: 0,
      };
    }

    const { data, error } = await supabase
      .from('attempts')
      .select('verdict, exec_ms')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        successRate: 0,
        averageExecutionTime: 0,
      };
    }

    const totalAttempts = data.length;
    const successfulAttempts = data.filter(a => a.verdict === 'pass').length;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
    
    const executionTimes = data
      .filter(a => a.exec_ms)
      .map(a => a.exec_ms);
    const averageExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;

    return {
      totalAttempts,
      successfulAttempts,
      successRate,
      averageExecutionTime,
    };
  }
}


