'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from './auth';
import { getStoredUser, getToken, isTokenExpired, saveSession, clearSession } from './auth';
import { login as apiLogin } from './api';

// ── Usuario demo para entorno académico ─────────────────────────────────────
// No consulta la base de datos ni el backend. Se autentica localmente.
// Los datos que visualiza provienen de demo-data.json (datos ficticios).

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

const DEMO_USER: AuthUser = {
  id:        0,
  nombre:    'Admin',
  apellido:  'Demo',
  username:  'demo',
  role:      'admin',
  site:      '',
  active:    true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

// Clave especial en localStorage para distinguir la sesión demo
const DEMO_FLAG_KEY = 'audit_demo_session';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  isAdmin: boolean;
  /** true cuando la sesión activa es la cuenta demo (sin backend) */
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión desde localStorage al montar (incluye sesión demo)
  useEffect(() => {
    // Verificar sesión demo primero
    if (localStorage.getItem(DEMO_FLAG_KEY) === 'true') {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

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
    // Autenticación local para el usuario demo (sin backend)
    if (username.trim().toLowerCase() === DEMO_USERNAME) {
      if (password !== DEMO_PASSWORD) {
        throw new Error('Contraseña incorrecta para el usuario demo');
      }
      localStorage.setItem(DEMO_FLAG_KEY, 'true');
      setUser(DEMO_USER);
      return;
    }

    // Autenticación normal contra el backend
    const result = await apiLogin(username, password);
    saveSession(result.token, result.user);
    setUser(result.user);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(DEMO_FLAG_KEY);
    clearSession();
    setUser(null);
  }, []);

  const isDemo = user?.username === DEMO_USERNAME;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      isAdmin: user?.role === 'admin',
      isDemo,
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
