// ── Configuración de planta (CIU / EEV) ──────────────────────────────────────
// Las URLs se queman en el bundle al momento del build desde las variables
// de entorno de GitHub Actions. En runtime el usuario elige cuál usar
// y la elección se persiste en localStorage.

export type SiteKey = 'CIU' | 'EEV';

export interface SiteOption {
  key:   SiteKey;
  label: string;
  color: string;
  apiUrl: string;
}

const STORAGE_KEY = 'audit_site';

function getDefaultApiUrl(siteKey: SiteKey): string {
  const envUrl = siteKey === 'CIU'
    ? process.env.NEXT_PUBLIC_API_URL_CIU
    : process.env.NEXT_PUBLIC_API_URL_EEV;

  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const host = window.location.hostname;
    const port = siteKey === 'CIU' ? '3001' : '3002';
    return `${protocol}://${host}:${port}`;
  }

  return siteKey === 'CIU'
    ? 'http://172.19.40.203:3001'
    : 'http://172.19.84.190:3002';
}

export const SITES: SiteOption[] = [
  {
    key:    'CIU',
    label:  'Soldati (CIU)',
    color:  'indigo',
    apiUrl: getDefaultApiUrl('CIU'),
  },
  {
    key:    'EEV',
    label:  'Echeverría (EEV)',
    color:  'emerald',
    apiUrl: getDefaultApiUrl('EEV'),
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
  return getActiveSite().apiUrl;
}
