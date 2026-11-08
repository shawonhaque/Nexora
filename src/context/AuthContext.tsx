import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/env';
import { authService, profileService } from '../services';
import { syncPersonalization } from '../hooks/usePersonalization';
import type { AppRole } from '../lib/database.types';

interface AuthValue {
  /** null while the initial session is still being restored. */
  loading: boolean;
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isAdmin: boolean;
  backendConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  /**
   * The role is read from the database-backed profiles table, never from
   * localStorage or client state, so a tampered client cannot grant itself
   * admin access. RLS enforces the same rule server-side.
   */
  const loadRole = useCallback(async (userId: string | null) => {
    if (!userId || !isSupabaseConfigured) {
      setRole(null);
      return;
    }
    const { data } = await profileService.getMyRole(userId);
    setRole(data ?? 'user');
  }, []);

  // Load the user's interests, saved items and history for whichever mode
  // applies (cloud when signed in, local otherwise).
  useEffect(() => {
    void syncPersonalization(session?.user.id ?? null);
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      void syncPersonalization(null);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadRole(data.session?.user.id ?? null).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadRole(nextSession?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authService.signIn(email, password);
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setRole(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await authService.requestPasswordReset(email);
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      user: session?.user ?? null,
      session,
      role,
      isAdmin: role === 'admin',
      backendConfigured: isSupabaseConfigured,
      signIn,
      signOut,
      requestPasswordReset,
    }),
    [loading, session, role, signIn, signOut, requestPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
