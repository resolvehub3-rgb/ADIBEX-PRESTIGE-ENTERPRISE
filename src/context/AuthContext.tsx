import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, getSupabaseCredentials } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { logAuditAction } from '../lib/db';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole, phone?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isConfigured } = getSupabaseCredentials();

  const fetchProfile = async (currentUser: User) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch user profile:', error.message);
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // Create fallback profile from user metadata
        const metadata = currentUser.user_metadata || {};
        const newProfile: UserProfile = {
          id: currentUser.id,
          full_name: metadata.full_name || currentUser.email?.split('@')[0] || 'Adibex User',
          role: (metadata.role as UserRole) || 'customer',
          email: currentUser.email || '',
          phone: metadata.phone || null,
          country: 'Ghana',
        };

        // Try inserting into profiles
        try {
          await supabase.from('profiles').upsert([newProfile]);
        } catch (e) {
          // ignore if table doesn't exist yet
        }
        setProfile(newProfile);
      }
    } catch (err) {
      console.warn('Error loading profile:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const supabase = getSupabase();
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            await fetchProfile(currentSession.user);
          }
          setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user || null);

            if (newSession?.user) {
              await fetchProfile(newSession.user);
              if (event === 'SIGNED_IN') {
                await logAuditAction(
                  newSession.user.id,
                  newSession.user.email || null,
                  profile?.role || 'user',
                  'USER_LOGIN',
                  'auth',
                  newSession.user.id
                );
              }
            } else {
              setProfile(null);
            }
            setIsLoading(false);
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (e) {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [isConfigured]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await fetchProfile(data.user);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'customer',
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
            phone: phone?.trim() || null,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          full_name: fullName.trim(),
          role,
          email: email.trim(),
          phone: phone?.trim() || null,
          country: 'Ghana',
        };
        await supabase.from('profiles').upsert([newProfile]);
        setProfile(newProfile);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await logAuditAction(
          user.id,
          user.email || null,
          profile?.role || 'user',
          'USER_LOGOUT',
          'auth',
          user.id
        );
      }
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!profile) return { success: false, error: 'Not authenticated' };

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
