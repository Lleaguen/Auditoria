'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAudits, AuditFilters } from './api';
import { computeDailyStats, computeSubcaStats, computeUserStats } from './audit-engine';
import type { AuditResult } from './types';

export interface DashboardData {
  audits: AuditResult[];
  dailyStats: ReturnType<typeof computeDailyStats>;
  subcaStats: ReturnType<typeof computeSubcaStats>;
  userStats: ReturnType<typeof computeUserStats>;
  totals: {
    totalHus: number;
    totalShipments: number;
    totalMissing: number;
    totalSurplus: number;
    husWithDeviation: number;
  };
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useDashboardData(filters?: AuditFilters): DashboardData {
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAudits(filters);
      setAudits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const dailyStats = computeDailyStats(audits);
  const subcaStats = computeSubcaStats(audits);
  const userStats  = computeUserStats(audits);

  const totals = {
    totalHus:         audits.length,
    totalShipments:   audits.reduce((s, a) => s + a.totalSystem, 0),
    totalMissing:     audits.reduce((s, a) => s + a.totalMissing, 0),
    totalSurplus:     audits.reduce((s, a) => s + a.totalSurplus, 0),
    husWithDeviation: audits.filter(
      (a) => a.totalMissing > 0 || a.totalSurplus > 0 || a.totalCrossed > 0
    ).length,
  };

  return { audits, dailyStats, subcaStats, userStats, totals, loading, error, reload: load };
}
