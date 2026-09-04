import { supabase } from '../lib/supabase';
import { Language } from '../models/Problem';

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
        let errorMessage = `Execution failed: HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorText;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {
          errorMessage = `Execution failed: HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[ExecutionService] Raw result:', result);
      
      // Determine verdict
      let verdict: 'pass' | 'fail' | 'error' = 'fail';
      
      if (result.error) {
        verdict = 'error';
      } else if (expectedOutput) {
        // Compare outputs (normalize whitespace and line endings)
        const actual = (result.output || '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
        const expected = expectedOutput.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
        verdict = actual === expected ? 'pass' : 'fail';
        console.log('[ExecutionService] Comparison:', { actual, expected, verdict });
      } else if (result.output) {
        // No expected output to compare, but we got output (not an error)
        verdict = 'fail';
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

  static async runCode(code: string, language: Language): Promise<ExecutionResult> {
    return await this.executeCode(code, language);
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

    // Try with 'exec_ms' first (simple schema), fallback to 'execution_time' (complete schema)
    let data, error;
    
    const { data: data1, error: error1 } = await supabase
      .from('attempts')
      .select('verdict, exec_ms')
      .eq('user_id', user.id);
    
    if (!error1) {
      data = data1;
    } else {
      // Fallback: try with 'execution_time' column
      const { data: data2, error: error2 } = await supabase
        .from('attempts')
        .select('verdict, execution_time')
        .eq('user_id', user.id);
      
      data = data2?.map(a => ({ ...a, exec_ms: a.execution_time }));
      error = error2;
    }

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


