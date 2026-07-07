import type { AuditResult } from './types';
import type { AuthUser, LoginResponse, UserRole } from './auth';
import { getToken, clearSession } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  // Token expirado o inválido → limpiar sesión y recargar
  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/Auditoria/login';
    throw new Error('Sesión expirada');
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Error HTTP ${res.status}`);
  }

  return json.data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchMe(): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/me');
}

// ── Gestión de usuarios (solo admin) ─────────────────────────────────────────

export interface CreateUserInput {
  nombre: string;
  apellido: string;
  username: string;
  password: string;
  role: UserRole;
}

export async function fetchUsers(): Promise<AuthUser[]> {
  return request<AuthUser[]>('/api/auth/users');
}

export async function createUser(input: CreateUserInput): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await request<null>(`/api/auth/users/${id}`, { method: 'DELETE' });
}

// ── Auditorías ───────────────────────────────────────────────────────────────

export interface AuditFilters {
  date?: string;
  shift?: string;
  subca?: string;
  fromDate?: string;
  toDate?: string;
}

export async function fetchAudits(filters?: AuditFilters): Promise<AuditResult[]> {
  const params = new URLSearchParams();
  if (filters?.date)     params.set('date',     filters.date);
  if (filters?.shift)    params.set('shift',    filters.shift);
  if (filters?.subca)    params.set('subca',    filters.subca);
  if (filters?.fromDate) params.set('fromDate', filters.fromDate);
  if (filters?.toDate)   params.set('toDate',   filters.toDate);
  const qs = params.toString();
  return request<AuditResult[]>(`/api/audits${qs ? `?${qs}` : ''}`);
}

export async function saveAudit(audit: AuditResult): Promise<AuditResult> {
  return request<AuditResult>('/api/audits', {
    method: 'POST',
    body: JSON.stringify(audit),
  });
}

export async function deleteAuditById(id: number): Promise<void> {
  await request<null>(`/api/audits/${id}`, { method: 'DELETE' });
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
