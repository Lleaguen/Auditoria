'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  computeDailyStats,
  computeSubcaStats,
  computeUserStats,
} from '@/lib/audit-engine';
import StatCard from '@/components/ui/StatCard';
import DailyStatsTable from './DailyStatsTable';
import SubcaTable from './SubcaTable';
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
} from 'lucide-react';
import type { AuditResult } from '@/lib/types';

export default function DashboardPanel() {
  const { state, deleteAudit } = useAppStore();
  const audits = state.audits;

  const dailyStats  = useMemo(() => computeDailyStats(audits),  [audits]);
  const subcaStats  = useMemo(() => computeSubcaStats(audits),  [audits]);
  const userStats   = useMemo(() => computeUserStats(audits),   [audits]);

  const totals = useMemo(() => {
    const totalHus          = audits.length;
    const totalShipments    = audits.reduce((s, a) => s + a.totalSystem, 0);
    const totalMissing      = audits.reduce((s, a) => s + a.totalMissing, 0);
    const totalCrossed      = audits.reduce((s, a) => s + a.totalCrossed, 0);
    const totalUnmanifested = audits.reduce((s, a) => s + a.totalUnmanifested, 0);
    const husWithDeviation  = audits.filter(
      (a) => a.totalMissing > 0 || a.totalCrossed > 0 || a.totalUnmanifested > 0
    ).length;
    return { totalHus, totalShipments, totalMissing, totalCrossed, totalUnmanifested, husWithDeviation };
  }, [audits]);

  if (audits.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="bg-zinc-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart2 size={24} className="text-zinc-300" />
        </div>
        <p className="font-semibold text-zinc-600">Sin auditorías todavía</p>
        <p className="text-sm text-zinc-400 mt-1">
          Realizá y guardá auditorías en "Auditoría HU" para ver las métricas.
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
          label="Cruzados"
          value={totals.totalCrossed.toLocaleString()}
          colorClass="text-yellow-600"
          icon={<PackagePlus size={14} />}
        />
        <StatCard
          label="Sin manifestar"
          value={totals.totalUnmanifested.toLocaleString()}
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

      {/* Tabla diaria */}
      <Section title="Detalle por fecha">
        <DailyStatsTable data={dailyStats} />
      </Section>

      {/* Sub-CA */}
      <Section title="Detalle por sub-CA y usuario">
        <SubcaTable data={subcaStats} audits={audits} />
      </Section>

      {/* Ranking usuarios */}
      <Section title="Ranking por tasa de error" icon={<Users size={14} />}>
        <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
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
        <AuditHistoryTable audits={audits} onDelete={deleteAudit} />
      </Section>

    </div>
  );
}

// ── Sección ──────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-700 uppercase tracking-wide">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Historial ─────────────────────────────────────────────────────────────────

function AuditHistoryTable({
  audits,
  onDelete,
}: {
  audits: AuditResult[];
  onDelete: (id: number) => Promise<void>;
}) {
  const handleDelete = async (a: AuditResult) => {
    if (a.id == null) return;
    if (!confirm(`¿Eliminar la auditoría del HU ${a.huId}?`)) return;
    await onDelete(a.id);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
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
              <th className="px-4 py-3 text-right font-semibold">Cruzados</th>
              <th className="px-4 py-3 text-right font-semibold">Sin Manifestar</th>
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
                  <span className={a.totalCrossed > 0 ? 'text-yellow-600 font-bold' : 'text-zinc-300'}>
                    {a.totalCrossed}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={a.totalUnmanifested > 0 ? 'text-orange-600 font-bold' : 'text-zinc-300'}>
                    {a.totalUnmanifested}
                  </span>
                </td>
                <td
                  className="px-4 py-2.5 text-zinc-400 max-w-[160px] truncate font-mono text-[11px]"
                  title={a.assemblyUsers.join(', ')}
                >
                  {a.assemblyUsers.join(', ') || '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={a.id == null}
                    className="text-zinc-200 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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

