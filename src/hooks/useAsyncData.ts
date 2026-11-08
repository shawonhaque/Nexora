import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/env';
import type { ServiceError, Result } from '../lib/errors';

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: ServiceError | null;
  /** True when the rendered data is placeholder content, not live records. */
  isDemo: boolean;
  reload: () => void;
}

/**
 * Runs a service call and keeps the component in sync with its result.
 *
 * When Supabase is not configured the `demo` value is returned immediately and
 * `isDemo` is set, so callers can render a clear notice instead of an error.
 */
export function useAsyncData<T>(
  loader: () => Promise<Result<T>>,
  demo: T,
  deps: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T>(demo);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<ServiceError | null>(null);
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured);
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
      setData(demo);
      setIsDemo(true);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (!active || !mounted.current) return;
        if (result.error) {
          // Keep the last good value visible rather than blanking the page.
          setError(result.error);
        } else if (result.data !== null) {
          setData(result.data);
          setIsDemo(false);
        }
      })
      .finally(() => {
        if (active && mounted.current) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { data, loading, error, isDemo, reload };
}
