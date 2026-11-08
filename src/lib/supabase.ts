import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './env';
import type { Database } from './database.types';

/**
 * Single reusable Supabase client for the whole app.
 *
 * Returns null when the project is not configured, so callers can render a
 * clear "connect your Supabase project" state instead of throwing at import
 * time. Every service checks for this.
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'nexora-auth',
      },
    })
  : null;

/** Thrown by services when an operation is attempted without a backend. */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.'
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

/**
 * Returns the client or throws a typed error. Use inside service functions so
 * a missing backend surfaces as a handled error rather than a crash.
 */
export function requireClient(): SupabaseClient<Database> {
  if (!supabase) throw new SupabaseNotConfiguredError();
  return supabase;
}
