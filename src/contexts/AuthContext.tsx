import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../models/User';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, plan: 'baseline' | 'time_crunch') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          preferred_languages: data.preferred_languages || ['python', 'java', 'cpp'],
          plan: data.plan || 'baseline',
          created_at: supabaseUser.created_at,
          updated_at: new Date().toISOString(),
        });
      } else {
        // Create profile if doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: supabaseUser.id,
            preferred_languages: ['python', 'java', 'cpp'],
            plan: 'baseline',
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email!,
            preferred_languages: ['python', 'java', 'cpp'],
            plan: 'baseline',
            created_at: supabaseUser.created_at,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // User profile will be fetched automatically by the auth state change listener
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUp = async (email: string, password: string, plan: 'baseline' | 'time_crunch') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create user profile with selected plan
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            preferred_languages: ['python', 'java', 'cpp'],
            plan: plan,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      // User profile will be fetched automatically by the auth state change listener
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}