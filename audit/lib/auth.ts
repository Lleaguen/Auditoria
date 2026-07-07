// ── Tipos de autenticación ───────────────────────────────────────────────────

export type UserRole = 'admin' | 'auditor';

export interface AuthUser {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── Claves de almacenamiento ─────────────────────────────────────────────────

const TOKEN_KEY = 'audit_token';
const USER_KEY  = 'audit_user';

// ── Helpers de sesión ────────────────────────────────────────────────────────

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}
