'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { useJsonDashboardData } from '@/lib/useJsonDashboardData';
import { computeDailyStats, computeSubcaStats } from '@/lib/audit-engine';
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
  BarChart2, PackageX, PackagePlus, ClipboardList,
  TrendingDown, FlaskConical, Building2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const PIE_COLORS = ['#ef4444', '#eab308', '#f97316', '#6366f1', '#10b981', '#8b5cf6', '#06b6d4'];

const SITE_OPTIONS = [
  { label: 'Todos los sitios', value: '' },
  { label: 'Soldati (CIU)',    value: 'ARXCF1' },
  { label: 'EEV',              value: 'ARXBA3' },
];

export default function PreviewPanel() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  // Redirigir si no es admin
  React.useEffect(() => {
    if (!isAdmin) router.replace('/dashboard');
  }, [isAdmin, router]);

  const [filterSite,  setFilterSite]  = useState('');
  const [filterDate,  setFilterDate]  = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterSubca, setFilterSubca] = useState('');

  const { audits: allAudits, loading, error } = useJsonDashboardData(filterSite || undefined);

  // Filtros secundarios sobre los audits ya filtrados por site
  const audits = useMemo(() => {
    return allAudits.filter((a) => {
      if (filterDate  && a.date  !== filterDate)  return false;
      if (filterShift && a.shift !== filterShift) return false;
      if (filterSubca && !a.subca.toLowerCase().includes(filterSubca.toLowerCase())) return false;
      return true;
    });
  }, [allAudits, filterDate, filterShift, filterSubca]);

  // Estadísticas derivadas (reutilizando las funciones del motor)
  const dailyStats = useMemo(() => computeDailyStats(audits), [audits]);
  const subcaStats = useMemo(() => computeSubcaStats(audits), [audits]);
  const totals = useMemo(() => ({
    totalHus:          audits.length,
    totalShipments:    audits.reduce((s: number, a) => s + a.totalSystem, 0),
    totalMissing:      audits.reduce((s: number, a) => s + a.totalMissing, 0),
    totalCrossed:      audits.reduce((s: number, a) => s + a.totalCrossed, 0),
    totalUnmanifested: audits.reduce((s: number, a) => s + a.totalUnmanifested, 0),
    husWithDeviation:  audits.filter(
      (a) => a.totalMissing > 0 || a.totalCrossed > 0 || a.totalUnmanifested > 0
    ).length,
  }), [audits]);

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

  const hasFilters = filterDate || filterShift || filterSubca;
  const clearFilters = () => { setFilterDate(''); setFilterShift(''); setFilterSubca(''); };

  if (!isAdmin) return null;

  return (
    <div className="space-y-8">

      {/* Selector de sitio */}
      <div className="flex flex-wrap items-center gap-3">
        <Building2 size={14} className="text-zinc-500" />
        <span className="text-sm text-zinc-600 font-medium">Sitio:</span>
        {SITE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterSite(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filterSite === opt.value
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 font-medium">Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 font-medium">Turno</label>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Todos</option>
              <option value="TT">TT</option>
              <option value="TN">TN</option>
              <option value="TM">TM</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 font-medium">Sub-CA</label>
            <input
              type="text"
              placeholder="Ej: SBU2"
              value={filterSubca}
              onChange={(e) => setFilterSubca(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-red-500 px-2 py-1.5 border border-zinc-200 rounded-lg hover:border-red-200 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Estados de carga y error */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mr-3" />
          Cargando datos del Excel...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          Error al cargar los datos: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              label="HUs auditados"
              value={totals.totalHus}
              icon={<ClipboardList size={14} />}
            />
            <StatCard
              label="Shipments"
              value={totals.totalShipments.toLocaleString()}
              icon={<BarChart2 size={14} />}
            />
            <StatCard
              label="HUs con desvío"
              value={totals.husWithDeviation}
              sub={totals.totalHus > 0 ? `${((totals.husWithDeviation / totals.totalHus) * 100).toFixed(1)}%` : '0%'}
              colorClass={totals.husWithDeviation > 0 ? 'text-red-600' : 'text-zinc-900'}
              icon={<TrendingDown size={14} />}
            />
            <StatCard
              label="Faltantes"
              value={totals.totalMissing}
              colorClass={totals.totalMissing > 0 ? 'text-red-600' : 'text-zinc-900'}
              icon={<PackageX size={14} />}
            />
            <StatCard
              label="Cruzados"
              value={totals.totalCrossed}
              colorClass={totals.totalCrossed > 0 ? 'text-yellow-600' : 'text-zinc-900'}
              icon={<PackagePlus size={14} />}
            />
            <StatCard
              label="Sin manifestar"
              value={totals.totalUnmanifested}
              colorClass={totals.totalUnmanifested > 0 ? 'text-orange-500' : 'text-zinc-900'}
              icon={<PackageX size={14} />}
            />
          </div>

          {/* Gráficos */}
          {dailyStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">HUs con desvío por día</p>
                <DailyDeviationChart data={dailyStats} />
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">% HUs con desvío</p>
                <DeviationPercentChart data={dailyStats} />
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">Errores por tipo (por día)</p>
                <ShipmentErrorChart data={dailyStats} />
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">% Envíos con errores</p>
                <ErrorRateChart data={dailyStats} />
              </div>

              {/* Torta por Sub-CA */}
              {pieData.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
                  <p className="text-sm font-semibold text-zinc-700 mb-4">Errores por Sub-CA (top 8)</p>
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
                        {pieData.map((_entry, i) => (                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Tabla diaria */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Estadísticas por fecha</h3>
            <DailyStatsTable data={dailyStats} />
          </div>

          {/* Tabla por Sub-CA */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Estadísticas por Sub-CA</h3>
            <SubcaTable data={subcaStats} audits={audits} />
          </div>
        </>
      )}
    </div>
  );
}
