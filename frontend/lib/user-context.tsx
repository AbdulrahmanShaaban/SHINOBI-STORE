'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, type AuthUser } from '@/lib/auth';

interface UserContextValue {
  user: AuthUser | null;
  /** True until the first /auth/me probe settles. */
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refresh: async () => null,
  setUser: () => undefined,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = await authApi.me();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial probe: no synchronous setState before the await settles.
    let alive = true;
    authApi
      .me()
      .then((u) => {
        if (!alive) return;
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refresh, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
