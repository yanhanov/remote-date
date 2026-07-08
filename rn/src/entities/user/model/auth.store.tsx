import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authAPI } from '@/shared/api/auth.api';
import { tokenService } from '@/shared/api/token.service';
import { setSessionExpiredHandler } from '@/shared/api/session';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  initialize: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  setUser: (userData: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!(await tokenService.hasTokens())) {
      setUser(null);
      return;
    }

    try {
      const userData = await authAPI.getMe();
      setUser(userData);
    } catch {
      await tokenService.clearTokens();
      setUser(null);
    }
  }, []);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (isInitialized) {
      return !!user;
    }

    if (!(await tokenService.hasTokens())) {
      setIsInitialized(true);
      return false;
    }

    try {
      setIsLoading(true);
      const userData = await authAPI.getMe();
      setUser(userData);
      setIsInitialized(true);
      return true;
    } catch {
      await tokenService.clearTokens();
      setUser(null);
      setIsInitialized(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, user]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
      await tokenService.clearTokens();
      setIsInitialized(false);
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setIsInitialized(false);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isInitialized,
      isLoading,
      initialize,
      refreshUser,
      setUser,
      logout,
    }),
    [user, isInitialized, isLoading, initialize, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
