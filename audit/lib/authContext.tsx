'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from './auth';
import { getStoredUser, getToken, isTokenExpired, saveSession, clearSession } from './auth';
import { login as apiLogin } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión desde localStorage al montar
  useEffect(() => {
    const token      = getToken();
    const storedUser = getStoredUser();

    if (token && storedUser && !isTokenExpired(token)) {
      setUser(storedUser);
    } else {
      clearSession();
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    saveSession(result.token, result.user);
    setUser(result.user);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
