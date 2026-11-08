import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/env';
import type { Result, ServiceError } from '../lib/errors';

/**
 * How long a backend call may take before the UI gives up. Without this, an
 * unreachable project leaves every page showing a loading skeleton forever,
 * which looks like a broken site rather than an unreachable one.
 */
const REQUEST_TIMEOUT_MS = 12_000;

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: ServiceError | null;
  /** True when Supabase is not configured, so no query could be attempted. */
  notConfigured: boolean;
  reload: () => void;
}

/**
 * Runs a Supabase-backed service call.
 *
 * There is deliberately no placeholder fallback. When the backend is not
 * configured, `notConfigured` is set and the caller renders an explanation
 * instead of invented records. When a query fails, the error is surfaced and
 * the last good value is kept on screen rather than being replaced by fake data.
 */
export function useAsyncData<T>(
  loader: () => Promise<Result<T>>,
  initial: T,
  deps: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<ServiceError | null>(null);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    // Race the call against a timeout so an unreachable backend surfaces as an
    // error the user can act on, rather than an indefinite skeleton.
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      if (active && mounted.current) {
        setError({
          message: 'The backend did not respond in time. It may be unreachable.',
          code: 'timeout',
        });
        setLoading(false);
      }
    }, REQUEST_TIMEOUT_MS);

    loaderRef
      .current()
      .then((result) => {
        if (!active || !mounted.current || timedOut) return;
        if (result.error) {
          // Keep whatever is already rendered; surface the failure separately.
          setError(result.error);
        } else if (result.data !== null) {
          setData(result.data);
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active && mounted.current && !timedOut) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { data, loading, error, notConfigured: !isSupabaseConfigured, reload };
}
