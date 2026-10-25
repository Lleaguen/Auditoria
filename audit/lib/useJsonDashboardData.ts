'use client';

import { useState, useEffect } from 'react';
import { computeDailyStats, computeSubcaStats, computeUserStats } from './audit-engine';
import type { AuditResult } from './types';

export interface JsonDashboardData {
  audits: AuditResult[];
  dailyStats: ReturnType<typeof computeDailyStats>;
  subcaStats: ReturnType<typeof computeSubcaStats>;
  userStats: ReturnType<typeof computeUserStats>;
  totals: {
    totalHus: number;
    totalShipments: number;
    totalMissing: number;
    totalCrossed: number;
    totalUnmanifested: number;
    husWithDeviation: number;
  };
  loading: boolean;
  error: string | null;
}

/**
 * Carga los datos de auditoría desde el JSON estático generado a partir del
 * Excel de referencia (dashboard-data.json). Solo usado en la vista de prueba
 * accesible para administradores.
 */
export function useJsonDashboardData(site?: string): JsonDashboardData {
  const [allAudits, setAllAudits] = useState<AuditResult[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${base}/dashboard-data.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: AuditResult[]) => setAllAudits(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filtrar por site si se indica (ej: 'ARXCF1' o 'ARXBA3')
  const audits = site
    ? allAudits.filter((a) => a.site === site)
    : allAudits;

  const dailyStats = computeDailyStats(audits);
  const subcaStats = computeSubcaStats(audits);
  const userStats  = computeUserStats(audits);

  const totals = {
    totalHus:          audits.length,
    totalShipments:    audits.reduce((s, a) => s + a.totalSystem, 0),
    totalMissing:      audits.reduce((s, a) => s + a.totalMissing, 0),
    totalCrossed:      audits.reduce((s, a) => s + a.totalCrossed, 0),
    totalUnmanifested: audits.reduce((s, a) => s + a.totalUnmanifested, 0),
    husWithDeviation:  audits.filter(
      (a) => a.totalMissing > 0 || a.totalCrossed > 0 || a.totalUnmanifested > 0
    ).length,
  };

  return { audits, dailyStats, subcaStats, userStats, totals, loading, error };
}
