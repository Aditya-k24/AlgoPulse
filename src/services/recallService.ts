import { supabase } from '../lib/supabase';
import { getRecalls, upsertRecalls, saveSolved } from '../utils/storage';
import { NotificationService } from './notificationService';
import { getRecallTimestamps } from '../utils/recall';

export class RecallService {
  static async scheduleProblemRecall(
    problemId: string,
    problemTitle: string,
    plan: 'baseline' | 'time_crunch'
  ): Promise<void> {
    try {
      // Save as solved locally
      await saveSolved(problemId);
      
      // Schedule notifications
      await NotificationService.scheduleRecallNotifications(
        problemId,
        problemTitle,
        new Date(),
        plan
      );
      
      // Sync with server
      await this.syncRecallsToServer(problemId, plan);
    } catch (error) {
      console.error('Error scheduling recall:', error);
      throw error;
    }
  }

  static async syncRecallsToServer(
    problemId: string,
    plan: 'baseline' | 'time_crunch'
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const recallDates = getRecallTimestamps(new Date(), plan);
      
      // Insert recalls into database
      const recalls = recallDates.map(date => ({
        user_id: user.id,
        problem_id: problemId,
        due_at: date.toISOString(),
        completed: false,
      }));

      const { error } = await supabase
        .from('recalls')
        .upsert(recalls, { 
          onConflict: 'user_id,problem_id,due_at',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error syncing recalls to server:', error);
      }
    } catch (error) {
      console.error('Error in syncRecallsToServer:', error);
    }
  }

  static async getUpcomingRecalls(days: number = 7): Promise<any[]> {
    try {
      const recalls = await getRecalls();
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      
      const upcoming = Object.values(recalls).filter(recall => {
        const dueDate = new Date(recall.dueAt);
        return dueDate >= now && dueDate <= futureDate && !recall.completed;
      });

      // Get problem details for each recall
      const recallsWithProblems = await Promise.all(
        upcoming.map(async (recall) => {
          try {
            const problem = await supabase
              .from('problems')
              .select('title, category, difficulty')
              .eq('id', recall.id)
              .single();
            
            return {
              ...recall,
              problem: problem.data,
            };
          } catch (error) {
            console.error('Error fetching problem for recall:', error);
            return {
              ...recall,
              problem: { title: 'Unknown Problem', category: 'Unknown', difficulty: 'Unknown' },
            };
          }
        })
      );

      return recallsWithProblems.sort((a, b) => 
        new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      );
    } catch (error) {
      console.error('Error getting upcoming recalls:', error);
      return [];
    }
  }

  static async markRecallCompleted(problemId: string, recallIndex: number): Promise<void> {
    try {
      // Update local storage
      await NotificationService.markRecallCompleted(problemId, recallIndex);
      
      // Update server
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('recalls')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString() 
          })
          .eq('user_id', user.id)
          .eq('problem_id', problemId);

        if (error) {
          console.error('Error marking recall as completed:', error);
        }
      }
    } catch (error) {
      console.error('Error in markRecallCompleted:', error);
    }
  }

  static async getRecallStats(): Promise<{
    totalScheduled: number;
    totalCompleted: number;
    completionRate: number;
    upcomingCount: number;
  }> {
    try {
      const recalls = await getRecalls();
      const recallValues = Object.values(recalls);
      
      const totalScheduled = recallValues.length;
      const totalCompleted = recallValues.filter(r => r.completed).length;
      const completionRate = totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0;
      
      const now = new Date();
      const upcomingCount = recallValues.filter(r => 
        new Date(r.dueAt) >= now && !r.completed
      ).length;

      return {
        totalScheduled,
        totalCompleted,
        completionRate,
        upcomingCount,
      };
    } catch (error) {
      console.error('Error getting recall stats:', error);
      return {
        totalScheduled: 0,
        totalCompleted: 0,
        completionRate: 0,
        upcomingCount: 0,
      };
    }
  }

  static async rescheduleRecalls(problemId: string, newPlan: 'baseline' | 'time_crunch'): Promise<void> {
    try {
      // Cancel existing notifications
      await NotificationService.cancelRecallNotifications(problemId);
      
      // Get problem title
      const { data: problem } = await supabase
        .from('problems')
        .select('title')
        .eq('id', problemId)
        .single();

      if (problem) {
        // Schedule new recalls
        await this.scheduleProblemRecall(problemId, problem.title, newPlan);
      }
    } catch (error) {
      console.error('Error rescheduling recalls:', error);
      throw error;
    }
  }

  static async clearAllRecalls(): Promise<void> {
    try {
      // Clear local storage
      const { getRecalls } = await import('../utils/storage');
      const recalls = await getRecalls();
      
      // Clear notifications
      await NotificationService.clearAllNotifications();
      
      // Clear server data
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('recalls')
          .delete()
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error clearing all recalls:', error);
      throw error;
    }
  }
}


