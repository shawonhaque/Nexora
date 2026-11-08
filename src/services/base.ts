import { requireClient } from '../lib/supabase';
import { fail, ok, toServiceError, type Result } from '../lib/errors';
import { isSupabaseConfigured } from '../lib/env';

export { requireClient, isSupabaseConfigured };

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const DEFAULT_PAGE_SIZE = 12;

/** Wraps a service body so every call returns the same Result shape. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  if (!isSupabaseConfigured) {
    return fail<T>(
      'Supabase is not connected yet. Add your project URL and anon key to enable live data.',
      'NOT_CONFIGURED',
      true
    );
  }
  try {
    return ok(await fn());
  } catch (error) {
    return fail<T>(toServiceError(error).message, toServiceError(error).code);
  }
}

/** Escapes characters that have meaning inside a PostgREST `or`/`ilike` filter. */
export function escapeFilter(value: string): string {
  return value.replace(/[%_,()\\]/g, (match) => `\\${match}`);
}
