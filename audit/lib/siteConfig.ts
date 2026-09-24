// ── Configuración de planta (CIU / EEV) ──────────────────────────────────────
// Las URLs se inyectan en el bundle al momento del build desde las variables
// de entorno de GitHub Actions (NEXT_PUBLIC_API_URL_CIU / EEV).
// En runtime el usuario elige cuál planta usar y se persiste en localStorage.

export type SiteKey = 'CIU' | 'EEV';

export interface SiteOption {
  key:   SiteKey;
  label: string;
  color: string;
}

const STORAGE_KEY = 'audit_site';

// Lee la URL directamente de las env vars injectadas por Next.js en build time.
// Si no existen (entorno local sin .env), devuelve localhost con puertos por defecto.
export function getApiUrlForSite(siteKey: SiteKey): string {
  const envUrl = siteKey === 'CIU'
    ? process.env.NEXT_PUBLIC_API_URL_CIU
    : process.env.NEXT_PUBLIC_API_URL_EEV;

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // Fallback solo para desarrollo local
  const port = siteKey === 'CIU' ? '3001' : '3002';
  return `http://localhost:${port}`;
}

export const SITES: SiteOption[] = [
  {
    key:   'CIU',
    label: 'Soldati (CIU)',
    color: 'indigo',
  },
  {
    key:   'EEV',
    label: 'Echeverría (EEV)',
    color: 'emerald',
  },
];

export function getStoredSite(): SiteKey | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'CIU' || v === 'EEV' ? v : null;
}

export function saveSite(key: SiteKey): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearSite(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getActiveSite(): SiteOption {
  const key = getStoredSite();
  return SITES.find((s) => s.key === key) ?? SITES[0];
}

export function getActiveApiUrl(): string {
  return getApiUrlForSite(getActiveSite().key);
}
