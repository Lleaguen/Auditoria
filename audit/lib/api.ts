import type { AuditResult } from './types';
import type { AuthUser, LoginResponse, UserRole } from './auth';
import { getToken, clearSession } from './auth';
import { getActiveApiUrl } from './siteConfig';

// BASE_URL se resuelve en cada request para respetar la planta activa
// elegida por el usuario en runtime (guardada en localStorage).
function getBaseUrl(): string {
  return getActiveApiUrl();
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  // Token expirado o inválido → limpiar sesión y recargar
  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
      window.location.href = '/Auditoria/login';
    }
    throw new Error('Sesión expirada');
  }

  let payload: ApiResponse<T> | null = null;
  const text = await res.text();

  try {
    payload = text ? JSON.parse(text) as ApiResponse<T> : null;
  } catch {
    throw new Error(text || `Error HTTP ${res.status}`);
  }

  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Error HTTP ${res.status}`);
  }

  return payload.data;
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

export async function updateUserRole(id: number, role: string): Promise<void> {
  await request<null>(`/api/auth/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export interface AuditorStat {
  userId: number;
  nombre: string;
  username: string;
  role: string;
  husAuditados: number;
  totalShipments: number;
  totalOk: number;
  totalMissing: number;
  totalSurplus: number;
  totalCrossed: number;
  totalUnmanifested: number;
  errorRate: number;
}

export async function fetchAuditorStats(fromDate?: string, toDate?: string): Promise<AuditorStat[]> {
  const params = new URLSearchParams();
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate)   params.set('toDate',   toDate);
  const qs = params.toString();
  return request<AuditorStat[]>(`/api/audits/auditor-stats${qs ? `?${qs}` : ''}`);
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
    const res = await fetch(`${getBaseUrl()}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Planes de auditoría ───────────────────────────────────────────────────────

export interface PlanItem {
  subca: string;
  targetHus: number;
  targetPiezas: number;
  assignedAuditor: string;
}

export interface AuditPlan {
  id?: number;
  date: string;
  shift: string;
  items: PlanItem[];
  createdBy?: number;
  createdAt?: string;
}

export async function fetchPlans(date?: string, shift?: string): Promise<AuditPlan[]> {
  const params = new URLSearchParams();
  if (date)  params.set('date',  date);
  if (shift) params.set('shift', shift);
  const qs = params.toString();
  return request<AuditPlan[]>(`/api/plans${qs ? `?${qs}` : ''}`);
}

export async function savePlan(plan: Omit<AuditPlan, 'id' | 'createdBy' | 'createdAt'>): Promise<AuditPlan> {
  return request<AuditPlan>('/api/plans', {
    method: 'POST',
    body: JSON.stringify(plan),
  });
}

export async function deletePlan(id: number): Promise<void> {
  await request<null>(`/api/plans/${id}`, { method: 'DELETE' });
}

// ── Post-Audits ───────────────────────────────────────────────────────────────

export interface PostShipmentInput {
  shipmentId:         string;
  outboundId:         string;
  labelingZone:       string;
  outboundDateOpened: string;
}

export interface SavePostAuditInput {
  auditId:       number;
  postDate:      string;
  csvDate:       string;
  csvFilename:   string;
  postShipments: PostShipmentInput[];
}

export async function fetchPostAudits(auditId?: number): Promise<import('./types').PostAuditResult[]> {
  const qs = auditId ? `?auditId=${auditId}` : '';
  return request<import('./types').PostAuditResult[]>(`/api/post-audits${qs}`);
}

export async function savePostAudit(input: SavePostAuditInput): Promise<import('./types').PostAuditResult> {
  return request<import('./types').PostAuditResult>('/api/post-audits', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deletePostAudit(id: number): Promise<void> {
  await request<null>(`/api/post-audits/${id}`, { method: 'DELETE' });
}

export async function fetchCorrectionStats(
  fromDate?: string,
  toDate?: string
): Promise<import('./types').CorrectionStat[]> {
  const params = new URLSearchParams();
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate)   params.set('toDate',   toDate);
  const qs = params.toString();
  return request<import('./types').CorrectionStat[]>(`/api/post-audits/correction-stats${qs ? `?${qs}` : ''}`);
}
