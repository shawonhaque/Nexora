/**
 * Environment configuration.
 *
 * The Supabase URL and anon key are the only client-side Supabase values.
 * The service_role key must never be referenced here — it belongs in
 * server-side code (Edge Functions) only.
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** True when both Supabase values are present, i.e. the backend is usable. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const BASE_PATH = import.meta.env.BASE_URL ?? '/';
