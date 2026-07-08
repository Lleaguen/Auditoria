'use client';

import React, { useMemo, useState } from 'react';
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
import * as XLSX from 'xlsx';
import {
  BarChart2, PackageX, PackagePlus, ClipboardList,
  TrendingDown, Trash2, Users, Download, Search, X,
} from 'lucide-react';
import type { AuditResult } from '@/lib/types';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const PIE_COLORS = ['#ef4444', '#eab308', '#f97316', '#6366f1', '#10b981', '#8b5cf6', '#06b6d4'];

export default function DashboardPanel() {
  const { state, deleteAudit } = useAppStore();
  const audits = state.audits;

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filterDate,  setFilterDate]  = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterSubca, setFilterSubca] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentResult, setShipmentResult] = useState<{ huId: string; date: string; subca: string } | null | 'not-found'>('not-found');
  const [searched, setSearched] = useState(false);

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      if (filterDate  && a.date  !== filterDate)  return false;
      if (filterShift && a.shift !== filterShift) return false;
      if (filterSubca && !a.subca.toLowerCase().includes(filterSubca.toLowerCase())) return false;
      return true;
    });
  }, [audits, filterDate, filterShift, filterSubca]);

  const hasFilters = filterDate || filterShift || filterSubca;
  const clearFilters = () => { setFilterDate(''); setFilterShift(''); setFilterSubca(''); };

  const dailyStats = useMemo(() => computeDailyStats(filtered),  [filtered]);
  const subcaStats = useMemo(() => computeSubcaStats(filtered),  [filtered]);
  const userStats  = useMemo(() => computeUserStats(filtered),   [filtered]);

  const totals = useMemo(() => {
    const totalHus          = filtered.length;
    const totalShipments    = filtered.reduce((s, a) => s + a.totalSystem, 0);
    const totalMissing      = filtered.reduce((s, a) => s + a.totalMissing, 0);
    const totalCrossed      = filtered.reduce((s, a) => s + a.totalCrossed, 0);
    const totalUnmanifested = filtered.reduce((s, a) => s + a.totalUnmanifested, 0);
    const husWithDeviation  = filtered.filter(
      (a) => a.totalMissing > 0 || a.totalCrossed > 0 || a.totalUnmanifested > 0
    ).length;
    return { totalHus, totalShipments, totalMissing, totalCrossed, totalUnmanifested, husWithDeviation };
  }, [filtered]);

  // ── Datos torta de errores por Sub-CA ────────────────────────────────────
  const pieData = useMemo(() =>
    subcaStats
      .map((s) => ({
        name:  s.subca || 'N/A',
        value: s.totalMissing + s.totalCrossed + s.totalUnmanifested,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  [subcaStats]);

  // ── Buscador de shipments ─────────────────────────────────────────────────
  const handleShipmentSearch = () => {
    const q = shipmentSearch.trim();
    if (!q) return;
    setSearched(true);
    // Buscar en todos los audits (sin filtros de fecha/subca para el buscador)
    for (const audit of audits) {
      const inSystem  = audit.systemShipments.includes(q);
      const inScanned = audit.scannedShipments.includes(q);
      const inResults = audit.results.some((r) => r.shipmentId === q);
      if (inSystem || inScanned || inResults) {
        setShipmentResult({ huId: audit.huId, date: audit.date, subca: audit.subca });
        return;
      }
    }
    setShipmentResult('not-found');
  };

  // ── Exportar todo a Excel ─────────────────────────────────────────────────
  const exportAll = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Detalle diario
    const dailyRows = dailyStats.map((d) => ({
      'Fecha':              d.date,
      'HUs auditados':      d.totalHusAudited,
      'HUs con desvío':     d.husWithDeviation,
      '% HUs con desvío':   `${d.percentHusWithDeviation.toFixed(2)}%`,
      'Shipments':          d.totalShipmentsAudited,
      'Faltantes':          d.totalMissing,
      'Cruzados':           d.totalCrossed,
      'Sin manifestar':     d.totalUnmanifested,
      '% con errores':      `${d.percentWithErrors.toFixed(2)}%`,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Por Fecha');

    // Hoja 2: Por Sub-CA
    const subcaRows = subcaStats.map((s) => ({
      'Sub-CA':         s.subca,
      'HUs auditados':  s.husAuditados,
      'Shipments':      s.totalShipments,
      'OK':             s.totalOk,
      'Faltantes':      s.totalMissing,
      'Cruzados':       s.totalCrossed,
      'Sin manifestar': s.totalUnmanifested,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subcaRows), 'Por Sub-CA');

    // Hoja 3: Historial completo
    const histRows = filtered.map((a) => ({
      'Fecha':         a.date,
      'Turno':         a.shift,
      'HU':            a.huId,
      'Sub-CA':        a.subca,
      'Sistema':       a.totalSystem,
      'Bipeados':      a.totalScanned,
      'OK':            a.totalOk,
      'Faltantes':     a.totalMissing,
      'Sobrantes':     a.totalSurplus,
      'Cruzados':      a.totalCrossed,
      'Sin manifestar':a.totalUnmanifested,
      'Usuarios armado': a.assemblyUsers.join(', '),
      'Observaciones': a.observations,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(histRows), 'Historial');

    // Hoja 4: Ranking usuarios
    const userRows = [...userStats].sort((a, b) => b.errorRate - a.errorRate).map((u) => ({
      'Usuario':    u.userId,
      'HUs':        u.totalHus,
      'Shipments':  u.totalShipments,
      'Errores':    u.totalErrors,
      'Tasa error': `${u.errorRate.toFixed(2)}%`,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userRows), 'Usuarios Armado');

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `dashboard_auditoria_${fecha}.xlsx`);
  };

  if (audits.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="bg-zinc-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart2 size={24} className="text-zinc-300" />
        </div>
        <p className="font-semibold text-zinc-600">Sin auditorías todavía</p>
        <p className="text-sm text-zinc-400 mt-1">Realizá y guardá auditorías para ver las métricas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Barra de herramientas: filtros + buscador + exportar ──────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">Fecha</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input-base text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">Turno</label>
            <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="input-base text-sm">
              <option value="">Todos</option>
              <option value="TM">TM</option>
              <option value="TT">TT</option>
              <option value="TN">TN</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">Sub-CA</label>
            <input type="text" value={filterSubca} onChange={(e) => setFilterSubca(e.target.value)} placeholder="Filtrar sub-CA..." className="input-base text-sm w-36" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 underline">
              <X size={10} /> Limpiar
            </button>
          )}
          <div className="flex-1" />
          <button onClick={exportAll} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm">
            <Download size={14} /> Exportar Excel
          </button>
        </div>

        {/* Buscador de shipments */}
        <div className="border-t border-zinc-100 pt-4">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-2">
            Buscar shipment → encontrar HU
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shipmentSearch}
              onChange={(e) => { setShipmentSearch(e.target.value); setSearched(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleShipmentSearch()}
              placeholder="ID del shipment..."
              className="input-base text-sm flex-1 max-w-xs"
            />
            <button
              onClick={handleShipmentSearch}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl"
            >
              <Search size={13} /> Buscar
            </button>
          </div>
          {searched && shipmentSearch && (
            <div className={`mt-2 px-4 py-3 rounded-xl text-sm border ${shipmentResult && shipmentResult !== 'not-found' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {shipmentResult && shipmentResult !== 'not-found' ? (
                <>
                  ✓ Shipment <span className="font-mono font-bold">{shipmentSearch}</span> encontrado en el HU{' '}
                  <span className="font-mono font-bold">{shipmentResult.huId}</span>{' '}
                  — fecha {shipmentResult.date} — Sub-CA {shipmentResult.subca}
                </>
              ) : (
                <>✗ Shipment <span className="font-mono font-bold">{shipmentSearch}</span> no encontrado en ninguna auditoría guardada.</>
              )}
            </div>
          )}
        </div>

        {hasFilters && (
          <p className="text-xs text-zinc-400">
            Mostrando <span className="font-semibold text-zinc-600">{filtered.length}</span> de {audits.length} auditorías
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="HUs auditados"   value={totals.totalHus}                    icon={<ClipboardList size={14} />} />
        <StatCard label="Con desvío"      value={totals.husWithDeviation}             colorClass="text-red-600"
          sub={totals.totalHus > 0 ? `${((totals.husWithDeviation / totals.totalHus) * 100).toFixed(1)}%` : ''}
          icon={<TrendingDown size={14} />} />
        <StatCard label="Shipments"       value={totals.totalShipments.toLocaleString()} icon={<ClipboardList size={14} />} />
        <StatCard label="Faltantes"       value={totals.totalMissing.toLocaleString()}   colorClass="text-red-600"    icon={<PackageX size={14} />} />
        <StatCard label="Cruzados"        value={totals.totalCrossed.toLocaleString()}   colorClass="text-yellow-600" icon={<PackagePlus size={14} />} />
        <StatCard label="Sin manifestar"  value={totals.totalUnmanifested.toLocaleString()} colorClass="text-orange-600" icon={<PackagePlus size={14} />} />
      </div>

      {/* Gráficos evolución diaria */}
      <Section title="Evolución diaria">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyDeviationChart  data={dailyStats} />
          <DeviationPercentChart data={dailyStats} />
          <ShipmentErrorChart   data={dailyStats} />
          <ErrorRateChart       data={dailyStats} />
        </div>
      </Section>

      {/* Torta errores por Sub-CA */}
      {pieData.length > 0 && (
        <Section title="Distribución de errores por Sub-CA">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} errores`, '']} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Tabla diaria */}
      <Section title="Detalle por fecha">
        <DailyStatsTable data={dailyStats} />
      </Section>

      {/* Sub-CA */}
      <Section title="Detalle por sub-CA y usuario">
        <SubcaTable data={subcaStats} audits={filtered} />
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
        <AuditHistoryTable audits={filtered} onDelete={deleteAudit} />
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-700 uppercase tracking-wide">
        {icon}{title}
      </h2>
      {children}
    </section>
  );
}

function AuditHistoryTable({ audits, onDelete }: { audits: AuditResult[]; onDelete: (id: number) => Promise<void> }) {
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
                  <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[11px] font-semibold">{a.shift}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-zinc-800 text-[11px]">{a.huId}</td>
                <td className="px-4 py-2.5 text-zinc-500">{a.subca}</td>
                <td className="px-4 py-2.5 text-right text-zinc-600">{a.totalSystem}</td>
                <td className="px-4 py-2.5 text-right text-zinc-600">{a.totalScanned}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{a.totalOk}</td>
                <td className="px-4 py-2.5 text-right"><span className={a.totalMissing > 0 ? 'text-red-600 font-bold' : 'text-zinc-300'}>{a.totalMissing}</span></td>
                <td className="px-4 py-2.5 text-right"><span className={a.totalCrossed > 0 ? 'text-yellow-600 font-bold' : 'text-zinc-300'}>{a.totalCrossed}</span></td>
                <td className="px-4 py-2.5 text-right"><span className={a.totalUnmanifested > 0 ? 'text-orange-600 font-bold' : 'text-zinc-300'}>{a.totalUnmanifested}</span></td>
                <td className="px-4 py-2.5 text-zinc-400 max-w-[160px] truncate font-mono text-[11px]" title={a.assemblyUsers.join(', ')}>
                  {a.assemblyUsers.join(', ') || '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button onClick={() => handleDelete(a)} disabled={a.id == null}
                    className="text-zinc-200 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-all disabled:opacity-30">
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
