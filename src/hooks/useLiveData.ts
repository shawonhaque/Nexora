import { useCallback, useEffect, useRef, useState } from 'react';

export interface LiveState<T> {
  data: T | null;
  /** True only on the first load, when there is nothing to show yet. */
  loading: boolean;
  /** True during a manual refresh while previous data stays visible. */
  refreshing: boolean;
  error: string | null;
  /** When the currently displayed data was fetched. */
  fetchedAt: Date | null;
  refresh: () => void;
}

/**
 * Runs an async loader and tracks loading, refreshing, error and freshness.
 *
 * A refresh keeps the previous data on screen and only replaces it on success,
 * so a failed reload never blanks a working page. Errors are surfaced rather
 * than swallowed, and no placeholder data is ever substituted.
 */
export function useLiveData<T>(loader: () => Promise<T>, deps: unknown[] = []): LiveState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);

  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const hasData = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (!active || !mounted.current) return;
        setData(result);
        setFetchedAt(new Date());
        hasData.current = true;
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active || !mounted.current) return;
        const message = cause instanceof Error ? cause.message : 'Something went wrong loading this data.';
        setError(message);
      })
      .finally(() => {
        if (!active || !mounted.current) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, refreshing, error, fetchedAt, refresh };
}
