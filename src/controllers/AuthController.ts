import { supabase } from '../lib/supabase';
import { User } from '../models/User';

export class AuthController {
  private static instance: AuthController;

  private constructor() {}

  static getInstance(): AuthController {
    if (!AuthController.instance) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        // Provide user-friendly error messages
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account before signing in.');
        } else if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many attempts. Please wait a moment and try again.');
        }
        throw error;
      }
      
      console.log('Successfully signed in:', data.user?.email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  async signUp(email: string, password: string, plan: 'baseline' | 'time_crunch'): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Sign up error:', error);
        // Provide user-friendly error messages
        if (error.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many attempts. Please wait a moment and try again.');
        }
        throw error;
      }

      // Create user profile with selected plan
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: data.user.email,
            preferred_languages: ['python', 'java', 'cpp'],
            plan: plan,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't throw error if profile already exists
          if (!profileError.message.includes('duplicate')) {
            throw new Error('Failed to create user profile');
          }
        }
      }

      console.log('Successfully signed up:', data.user?.email);
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        throw new Error('Account created! Please check your email to confirm your account before signing in.');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign up');
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('Successfully signed out');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        return {
          id: user.id,
          email: user.email!,
          preferred_languages: profile.preferred_languages || ['python', 'java', 'cpp'],
          plan: profile.plan || 'baseline',
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user !== null;
    } catch (error) {
      return false;
    }
  }

  async updateUserPlan(userId: string, plan: 'baseline' | 'time_crunch'): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan })
        .eq('user_id', userId);

      if (error) throw error;
      
      console.log('User plan updated to:', plan);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update user plan');
    }
  }

  async updatePreferredLanguages(userId: string, languages: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_languages: languages })
        .eq('user_id', userId);

      if (error) throw error;
      
      console.log('Preferred languages updated to:', languages);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update preferred languages');
    }
  }
}
