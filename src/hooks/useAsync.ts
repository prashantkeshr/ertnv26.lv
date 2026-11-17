import { useCallback, useEffect, useState } from 'react';
import { loadDataset, type DatasetKey, type DatasetOf } from '@/services/data/loader';

export type AsyncState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'ready'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: Error };

/**
 * Runs an async loader and exposes loading / ready / error with a reload function.
 * `key` identifies the request: when it changes the loader re-runs, and late results
 * from an earlier key are ignored.
 */
export function useAsync<T>(key: string, loader: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AsyncState<T> & { key: string }>({
    key,
    status: 'loading',
    data: undefined,
    error: undefined,
  });

  useEffect(() => {
    let active = true;
    setState({ key, status: 'loading', data: undefined, error: undefined });
    loader().then(
      (data) => active && setState({ key, status: 'ready', data, error: undefined }),
      (error: unknown) =>
        active &&
        setState({ key, status: 'error', data: undefined, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      active = false;
    };
    // The loader is intentionally keyed by `key`, not by identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  // A changed key means the stored state belongs to a previous request.
  const current: AsyncState<T> =
    state.key === key ? state : { status: 'loading', data: undefined, error: undefined };
  return { ...current, reload };
}

export function useDataset<K extends DatasetKey>(key: K) {
  return useAsync<DatasetOf<K>>(`dataset:${key}`, () => loadDataset(key));
}
