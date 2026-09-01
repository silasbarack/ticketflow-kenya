import { useCallback, useEffect, useRef, useState } from 'react';
import { AppError, normalizeError } from '@/utils/errors';

interface NetworkRequestState<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
}

/**
 * Generic data-fetching hook: runs `fetcher` on mount and exposes
 * `refetch`/`refresh` (the latter for pull-to-refresh, which doesn't show
 * the full-screen loading state). Every screen that lists data from a
 * service should use this instead of hand-rolling its own effect.
 */
export function useNetworkRequest<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<NetworkRequestState<T>>({
    data: null,
    isLoading: true,
    isRefreshing: false,
    error: null,
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (mode: 'initial' | 'refresh') => {
    setState((s) => ({
      ...s,
      isLoading: mode === 'initial',
      isRefreshing: mode === 'refresh',
      error: null,
    }));
    try {
      const data = await fetcherRef.current();
      setState({ data, isLoading: false, isRefreshing: false, error: null });
    } catch (error) {
      setState((s) => ({ ...s, isLoading: false, isRefreshing: false, error: normalizeError(error) }));
    }
  }, []);

  useEffect(() => {
    run('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    ...state,
    refetch: () => run('initial'),
    refresh: () => run('refresh'),
  };
}
