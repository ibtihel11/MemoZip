import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { subscribe } from '@/services/invalidate';

/**
 * Minimal data-fetching hook. Refetches when `deps` change and whenever a service reports a
 * successful mutation (services/invalidate). Consider TanStack Query if you need caching.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error('Something went wrong. Please try again.'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const refetch = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  return { data, error, loading: loading && data === undefined, refetch };
}
