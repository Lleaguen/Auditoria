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
  Users,
} from 'lucide-react';

export default function DashboardPanel() {
  const { state } = useAppStore();
  const audits = state.audits;

  const dailyStats = useMemo(() => computeDailyStats(audits), [audits]);
  const subcaStats = useMemo(() => computeSubcaStats(audits), [audits]);
  const userStats = useMemo(() => computeUserStats(audits), [audits]);

  const totals = useMemo(() => {
    const totalHus = audits.length;
    const totalShipments = audits.reduce((s, a) => s + a.totalSystem, 0);
    const totalMissing = audits.reduce((s, a) => s + a.totalMissing, 0);
    const totalSurplus = audits.reduce((s, a) => s + a.totalSurplus, 0);
    const husWithDev = audits.filter(
      (a) => a.totalMissing > 0 || a.totalSurplus > 0 || a.totalCrossed > 0
    ).length;
    return { totalHus, totalShipments, totalMissing, totalSurplus, husWithDev };
  }, [audits]);

  if (audits.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">No hay auditorías guardadas aún.</p>
        <p className="text-sm mt-1">
          Realizá auditorías en la sección "Auditoría HU" y guardalas para ver el dashboard.
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
          label="HUs con desvío"
          value={totals.husWithDev}
          colorClass="text-red-600"
          sub={
            totals.totalHus > 0
              ? `${((totals.husWithDev / totals.totalHus) * 100).toFixed(1)}%`
              : ''
          }
          icon={<BarChart2 size={14} />}
        />
        <StatCard
          label="Shipments totales"
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
      <section className="space-y-3">
        <h2 className="font-bold text-zinc-700 text-sm uppercase tracking-wide">
          Evolución diaria
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyDeviationChart data={dailyStats} />
          <DeviationPercentChart data={dailyStats} />
          <ShipmentErrorChart data={dailyStats} />
          <ErrorRateChart data={dailyStats} />
        </div>
      </section>

      {/* Tabla diaria */}
      <section className="space-y-3">
        <h2 className="font-bold text-zinc-700 text-sm uppercase tracking-wide">
          Detalle por fecha
        </h2>
        <DailyStatsTable data={dailyStats} />
      </section>

      {/* Tabla por sub-CA */}
      <section className="space-y-3">
        <h2 className="font-bold text-zinc-700 text-sm uppercase tracking-wide">
          Detalle por sub-CA y usuario de armado
        </h2>
        <SubcaTable data={subcaStats} audits={audits} />
      </section>

      {/* Tabla por usuario */}
      <section className="space-y-3">
        <h2 className="font-bold text-zinc-700 text-sm uppercase tracking-wide flex items-center gap-1.5">
          <Users size={14} />
          Ranking de usuarios por tasa de error
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-zinc-800 text-zinc-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Usuario</th>
                <th className="px-3 py-2.5 text-right font-semibold">HUs</th>
                <th className="px-3 py-2.5 text-right font-semibold">Shipments</th>
                <th className="px-3 py-2.5 text-right font-semibold">Errores</th>
                <th className="px-3 py-2.5 text-right font-semibold">Tasa error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[...userStats]
                .sort((a, b) => b.errorRate - a.errorRate)
                .map((u) => (
                  <tr key={u.userId} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-zinc-700">{u.userId}</td>
                    <td className="px-3 py-2 text-right">{u.totalHus}</td>
                    <td className="px-3 py-2 text-right">{u.totalShipments}</td>
                    <td className="px-3 py-2 text-right text-red-600">{u.totalErrors}</td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        u.errorRate > 5 ? 'text-red-600' : 'text-zinc-700'
                      }`}
                    >
                      {u.errorRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historial de auditorías */}
      <section className="space-y-3">
        <h2 className="font-bold text-zinc-700 text-sm uppercase tracking-wide">
          Historial de auditorías guardadas
        </h2>
        <AuditHistoryTable audits={audits} />
      </section>
    </div>
  );
}

function AuditHistoryTable({ audits }: { audits: ReturnType<typeof useAppStore>['state']['audits'] }) {
  const { deleteAudit } = useAppStore();
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
      <table className="w-full text-xs">
        <thead className="bg-zinc-800 text-zinc-200">
          <tr>
            <th className="px-3 py-2.5 text-left font-semibold">Fecha</th>
            <th className="px-3 py-2.5 text-left font-semibold">Turno</th>
            <th className="px-3 py-2.5 text-left font-semibold">HU</th>
            <th className="px-3 py-2.5 text-left font-semibold">Sub-CA</th>
            <th className="px-3 py-2.5 text-right font-semibold">Sistema</th>
            <th className="px-3 py-2.5 text-right font-semibold">Bipeados</th>
            <th className="px-3 py-2.5 text-right font-semibold">OK</th>
            <th className="px-3 py-2.5 text-right font-semibold">Faltantes</th>
            <th className="px-3 py-2.5 text-right font-semibold">Sobrantes</th>
            <th className="px-3 py-2.5 text-right font-semibold">Cruzados</th>
            <th className="px-3 py-2.5 text-left font-semibold">Usuarios armado</th>
            <th className="px-3 py-2.5 text-center font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {audits.map((a) => (
            <tr key={`${a.huId}-${a.date}`} className="hover:bg-zinc-50">
              <td className="px-3 py-2">{a.date}</td>
              <td className="px-3 py-2">{a.shift}</td>
              <td className="px-3 py-2 font-mono text-zinc-800">{a.huId}</td>
              <td className="px-3 py-2 text-zinc-600">{a.subca}</td>
              <td className="px-3 py-2 text-right">{a.totalSystem}</td>
              <td className="px-3 py-2 text-right">{a.totalScanned}</td>
              <td className="px-3 py-2 text-right text-emerald-600">{a.totalOk}</td>
              <td className="px-3 py-2 text-right text-red-600">{a.totalMissing}</td>
              <td className="px-3 py-2 text-right text-orange-600">{a.totalSurplus}</td>
              <td className="px-3 py-2 text-right text-yellow-600">{a.totalCrossed}</td>
              <td className="px-3 py-2 text-zinc-500 max-w-[180px] truncate" title={a.assemblyUsers.join(', ')}>
                {a.assemblyUsers.join(', ') || '—'}
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => deleteAudit(a.huId)}
                  className="text-zinc-300 hover:text-red-500 transition-colors text-xs"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
