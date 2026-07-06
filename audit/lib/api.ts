import type { AuditResult } from './types';

// En el browser las rutas /api/* son relativas al mismo origen.
// En SSR (server components) necesitamos la URL absoluta.
function baseUrl() {
  if (typeof window !== 'undefined') return ''; // browser: relativo
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data;
}

// ── Filtros ──────────────────────────────────────────────────────────────────

export interface AuditFilters {
  date?: string;
  shift?: string;
  subca?: string;
  fromDate?: string;
  toDate?: string;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

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
    const res = await fetch(`${baseUrl()}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
