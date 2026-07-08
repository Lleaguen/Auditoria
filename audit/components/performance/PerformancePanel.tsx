'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuditorStats, type AuditorStat } from '@/lib/api';
import { RefreshCw, AlertCircle, TrendingDown, TrendingUp, ClipboardCheck, User } from 'lucide-react';

function getRateColor(rate: number): string {
  if (rate === 0)   return 'text-emerald-600';
  if (rate < 2)     return 'text-yellow-600';
  if (rate < 5)     return 'text-orange-600';
  return 'text-red-600';
}

function getRateBg(rate: number): string {
  if (rate === 0)   return 'bg-emerald-50 border-emerald-200';
  if (rate < 2)     return 'bg-yellow-50 border-yellow-200';
  if (rate < 5)     return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

export default function PerformancePanel() {
  const [stats, setStats]       = useState<AuditorStat[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditorStats(fromDate || undefined, toDate || undefined);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const totalHus       = stats.reduce((s, a) => s + a.husAuditados, 0);
  const totalShipments = stats.reduce((s, a) => s + a.totalShipments, 0);
  const avgErrorRate   = stats.length > 0
    ? Math.round(stats.reduce((s, a) => s + a.errorRate, 0) / stats.length * 100) / 100
    : 0;

  return (
    <div className="space-y-6">

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">
            Desde
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-base text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">
            Hasta
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-base text-sm"
          />
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:bg-zinc-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="text-xs text-zinc-400 hover:text-zinc-600 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Auditores activos',   value: stats.length,      icon: User },
          { label: 'HUs auditados',        value: totalHus,          icon: ClipboardCheck },
          { label: 'Tasa error promedio',  value: `${avgErrorRate}%`, icon: avgErrorRate > 3 ? TrendingDown : TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{value}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 gap-3">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Cargando estadísticas...</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300">
                <th className="px-4 py-3 text-left font-semibold">Auditor</th>
                <th className="px-4 py-3 text-center font-semibold">HUs auditados</th>
                <th className="px-4 py-3 text-center font-semibold">Shipments</th>
                <th className="px-4 py-3 text-center font-semibold">OK</th>
                <th className="px-4 py-3 text-center font-semibold">Faltantes</th>
                <th className="px-4 py-3 text-center font-semibold">Sobrantes</th>
                <th className="px-4 py-3 text-center font-semibold">Cruzados</th>
                <th className="px-4 py-3 text-center font-semibold">Tasa error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {stats.map((s) => (
                <tr key={s.userId} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-700">
                        {s.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-800">{s.nombre}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{s.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-zinc-700">{s.husAuditados}</td>
                  <td className="px-4 py-3 text-center text-zinc-600">{s.totalShipments}</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-medium">{s.totalOk}</td>
                  <td className="px-4 py-3 text-center text-red-500 font-medium">{s.totalMissing}</td>
                  <td className="px-4 py-3 text-center text-orange-500 font-medium">{s.totalSurplus}</td>
                  <td className="px-4 py-3 text-center text-yellow-600 font-medium">{s.totalCrossed}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRateBg(s.errorRate)} ${getRateColor(s.errorRate)}`}>
                      {s.errorRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-400 text-sm">
                    No hay datos de auditorías con auditor registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalShipments > 0 && (
        <p className="text-xs text-zinc-400 text-right">
          Total shipments analizados: <span className="font-semibold text-zinc-600">{totalShipments.toLocaleString('es-AR')}</span>
        </p>
      )}
    </div>
  );
}
