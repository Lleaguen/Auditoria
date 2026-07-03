'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useDashboardData } from '@/lib/useDashboardData';
import StatCard from '@/components/ui/StatCard';
import DailyStatsTable from './DailyStatsTable';
import SubcaTable from './SubcaTable';
import ExportButton from './ExportButton';
import {
  DailyDeviationChart,
  DeviationPercentChart,
  ShipmentErrorChart,
  ErrorRateChart,
} from './DailyChart';
import {
  BarChart2,
  PackageX,
  PackagePlus,
  ClipboardList,
  TrendingDown,
  Trash2,
  Users,
  RefreshCw,
} from 'lucide-react';
import type { AuditResult } from '@/lib/types';
import { deleteAuditById } from '@/lib/api';

export default function DashboardPanel() {
  const { state } = useAppStore();
  const { audits, dailyStats, subcaStats, userStats, totals, loading, error, reload } =
    useDashboardData();

  // ── Estados de carga / error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400 gap-3">
        <RefreshCw size={18} className="animate-spin" />
        <span className="text-sm">Cargando auditorías desde la base de datos...</span>
      </div>
    );
  }

  if (error || !state.backendOnline) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
        <div className="bg-red-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart2 size={24} className="text-red-400" />
        </div>
        <p className="font-semibold text-zinc-700">Backend offline</p>
        <p className="text-sm text-zinc-400 mt-1 mb-4">
          El servidor local no está disponible. Inicialo con{' '}
          <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">npm run dev</code>
        </p>
        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}
        <button
          onClick={reload}
          className="flex items-center gap-2 mx-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
        <div className="bg-zinc-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart2 size={24} className="text-zinc-300" />
        </div>
        <p className="font-semibold text-zinc-600">Sin auditorías todavía</p>
        <p className="text-sm text-zinc-400 mt-1">
          Realizá y guardá auditorías en la sección "Auditoría HU" para ver las métricas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="HUs auditados"
          value={totals.totalHus}
          icon={<ClipboardList size={14} />}
        />
        <StatCard
          label="Con desvío"
          value={totals.husWithDeviation}
          colorClass="text-red-600"
          sub={
            totals.totalHus > 0
              ? `${((totals.husWithDeviation / totals.totalHus) * 100).toFixed(1)}% del total`
              : ''
          }
          icon={<TrendingDown size={14} />}
        />
        <StatCard
          label="Shipments"
          value={totals.totalShipments.toLocaleString()}
          icon={<ClipboardList size={14} />}
        />
        <StatCard
          label="Faltantes"
          value={totals.totalMissing.toLocaleString()}
          colorClass="text-red-600"
          icon={<PackageX size={14} />}
        />
        <StatCard
          label="Sobrantes"
          value={totals.totalSurplus.toLocaleString()}
          colorClass="text-orange-600"
          icon={<PackagePlus size={14} />}
        />
      </div>

      {/* Gráficos */}
      <Section title="Evolución diaria">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyDeviationChart data={dailyStats} />
          <DeviationPercentChart data={dailyStats} />
          <ShipmentErrorChart data={dailyStats} />
          <ErrorRateChart data={dailyStats} />
        </div>
      </Section>

      {/* Tabla diaria + export */}
      <Section
        title="Detalle por fecha"
        action={<ExportButton data={dailyStats} />}
      >
        <DailyStatsTable data={dailyStats} />
      </Section>

      {/* Sub-CA */}
      <Section title="Detalle por sub-CA y usuario">
        <SubcaTable data={subcaStats} audits={audits} />
      </Section>

      {/* Usuarios */}
      <Section title="Ranking por tasa de error" icon={<Users size={14} />}>
        <div className="rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300">
                <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                <th className="px-4 py-3 text-right font-semibold">HUs</th>
                <th className="px-4 py-3 text-right font-semibold">Shipments</th>
                <th className="px-4 py-3 text-right font-semibold">Errores</th>
                <th className="px-4 py-3 text-right font-semibold">Tasa error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {[...userStats].sort((a, b) => b.errorRate - a.errorRate).map((u) => (
                <tr key={u.userId} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 text-zinc-700 font-mono text-[11px]">{u.userId}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-600">{u.totalHus}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-600">{u.totalShipments}</td>
                  <td className="px-4 py-2.5 text-right text-red-500 font-semibold">{u.totalErrors}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-bold ${u.errorRate > 5 ? 'text-red-600' : 'text-zinc-600'}`}>
                      {u.errorRate.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Historial */}
      <Section title="Historial de auditorías">
        <AuditHistoryTable audits={audits} onDelete={reload} />
      </Section>
    </div>
  );
}

// ── Componente de sección ────────────────────────────────────────────────────

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-700 uppercase tracking-wide">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Historial ────────────────────────────────────────────────────────────────

function AuditHistoryTable({
  audits,
  onDelete,
}: {
  audits: AuditResult[];
  onDelete: () => Promise<void>;
}) {
  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (!confirm('¿Eliminar esta auditoría?')) return;
    try {
      await deleteAuditById(id);
      await onDelete();
    } catch {
      alert('Error al eliminar. Verificá que el backend esté corriendo.');
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900 text-zinc-300">
              <th className="px-4 py-3 text-left font-semibold">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold">Turno</th>
              <th className="px-4 py-3 text-left font-semibold">HU</th>
              <th className="px-4 py-3 text-left font-semibold">Sub-CA</th>
              <th className="px-4 py-3 text-right font-semibold">Sistema</th>
              <th className="px-4 py-3 text-right font-semibold">Bipeados</th>
              <th className="px-4 py-3 text-right font-semibold">OK</th>
              <th className="px-4 py-3 text-right font-semibold">Faltantes</th>
              <th className="px-4 py-3 text-right font-semibold">Sobrantes</th>
              <th className="px-4 py-3 text-right font-semibold">Cruzados</th>
              <th className="px-4 py-3 text-left font-semibold">Usuarios armado</th>
              <th className="px-4 py-3 text-center font-semibold"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-100">
            {audits.map((a) => (
              <tr key={`${a.huId}-${a.date}`} className="hover:bg-zinc-50">
                <td className="px-4 py-2.5 text-zinc-600">{a.date}</td>
                <td className="px-4 py-2.5">
                  <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                    {a.shift}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-zinc-800 text-[11px]">{a.huId}</td>
                <td className="px-4 py-2.5 text-zinc-500">{a.subca}</td>
                <td className="px-4 py-2.5 text-right text-zinc-600">{a.totalSystem}</td>
                <td className="px-4 py-2.5 text-right text-zinc-600">{a.totalScanned}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{a.totalOk}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={a.totalMissing > 0 ? 'text-red-600 font-bold' : 'text-zinc-300'}>
                    {a.totalMissing}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={a.totalSurplus > 0 ? 'text-orange-600 font-bold' : 'text-zinc-300'}>
                    {a.totalSurplus}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={a.totalCrossed > 0 ? 'text-amber-600 font-bold' : 'text-zinc-300'}>
                    {a.totalCrossed}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-zinc-400 max-w-[160px] truncate font-mono text-[11px]"
                  title={a.assemblyUsers.join(', ')}>
                  {a.assemblyUsers.join(', ') || '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-zinc-200 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
