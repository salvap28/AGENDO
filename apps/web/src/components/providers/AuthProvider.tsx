'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: string;
  hasCompletedOnboarding?: boolean;
  preferences?: any;
  isDev?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('agendo_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get('/auth/me');
      setUser(data.user ?? null);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        localStorage.removeItem('agendo_token');
        setUser(null);
      } else {
        console.warn('No pudimos validar tu sesión', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'agendo_token') refresh();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agendo_token');
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout,
    }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
