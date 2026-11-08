/** Normalised error shape returned by every service call. */
export interface ServiceError {
  message: string;
  code?: string;
  /** True when the failure is a missing Supabase configuration, not a real fault. */
  notConfigured?: boolean;
}

export interface Result<T> {
  data: T | null;
  error: ServiceError | null;
}

export function ok<T>(data: T): Result<T> {
  return { data, error: null };
}

export function fail<T = never>(message: string, code?: string, notConfigured = false): Result<T> {
  return { data: null, error: { message, code, notConfigured } };
}

/**
 * Converts an unknown thrown value into a safe, user-facing message.
 * Internal database details are never surfaced verbatim to public users.
 */
export function toServiceError(error: unknown): ServiceError {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; name?: string };
    if (e.name === 'SupabaseNotConfiguredError') {
      return { message: e.message ?? 'Backend not configured.', notConfigured: true };
    }
    return { message: e.message ?? 'Something went wrong.', code: e.code };
  }
  return { message: 'Something went wrong.' };
}
