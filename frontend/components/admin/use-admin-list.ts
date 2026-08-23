'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminError } from '@/lib/admin-api';

interface AdminListState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetches on mount and whenever `deps` change. Stale responses are dropped by
 * sequence ticket so fast filter typing can never render an older page over a
 * newer one.
 */
export function useAdminList<T>(fetcher: () => Promise<T>, deps: unknown[]): AdminListState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    const ticket = ++seq.current;
    fetcher()
      .then((result) => {
        if (seq.current !== ticket) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (seq.current !== ticket) return;
        setError(err instanceof AdminError ? err.message : 'Something went wrong.');
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are caller-owned
  }, [...deps, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
