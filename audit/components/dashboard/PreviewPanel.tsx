'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { useJsonDashboardData, type ExcelRow } from '@/lib/useJsonDashboardData';
import {
  BarChart2, PackageX, PackagePlus, ClipboardList,
  TrendingDown, FlaskConical, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
} from 'recharts';
import StatCard from '@/components/ui/StatCard';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SITE_OPTIONS = [
  { label: 'Todos los sitios', value: '' },
  { label: 'Soldati (CIU)',    value: 'ARXCF1' },
  { label: 'EEV',              value: 'ARXBA3' },
] as const;

function normalizeVsSistema(val: string | number | null): 'ok' | 'missing' | 'crossed' | 'unmanifested' | 'surplus' | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().toUpperCase();
  if (s === 'OK' || s === 'OK}') return 'ok';
  if (s === 'FALTANTE') return 'missing';
  if (s === 'CRUZADO') return 'crossed';
  if (s === 'SIN MANIFESTAR') return 'unmanifested';
  if (s === 'SOBRANTE') return 'surplus';
  return null;
}

// Agrupa filas por HU para calcular totales por HU
interface HuSummary {
  hu: string;
  date: string;
  turno: string;
  subca: string;
  site: string;
  totalShipments: number;
  totalOk: number;
  totalMissing: number;
  totalCrossed: number;
  totalUnmanifested: number;
  totalSurplus: number;
  hasDeviation: boolean;
}

function buildHuSummaries(rows: ExcelRow[]): HuSummary[] {
  const map = new Map<string, HuSummary>();

  for (const row of rows) {
    const hu   = row['HU A AUDITAR'] ?? '';
    const date = row.FECHA ?? '';
    const key  = `${hu}|${date}|${row.site}`;

    if (!map.has(key)) {
      map.set(key, {
        hu,
        date,
        turno:             row.TURNO ?? '',
        subca:             row.SUBCA ?? '',
        site:              row.site,
        totalShipments:    0,
        totalOk:           0,
        totalMissing:      0,
        totalCrossed:      0,
        totalUnmanifested: 0,
        totalSurplus:      0,
        hasDeviation:      false,
      });
    }

    const s      = map.get(key)!;
    const status = normalizeVsSistema(row['VS SISTEMA']);

    // SHIPMENTS POR SISTEMA solo aparece en la primera fila del HU
    if (row['SHIPMENTS POR SISTEMA'] !== null && s.totalShipments === 0) {
      s.totalShipments = row['SHIPMENTS POR SISTEMA'] as number;
    }

    if (status === 'ok')            s.totalOk++;
    else if (status === 'missing')  s.totalMissing++;
    else if (status === 'crossed')  s.totalCrossed++;
    else if (status === 'unmanifested') s.totalUnmanifested++;
    else if (status === 'surplus')  s.totalSurplus++;
  }

  for (const s of map.values()) {
    s.hasDeviation = s.totalMissing > 0 || s.totalCrossed > 0 || s.totalUnmanifested > 0;
    if (s.totalShipments === 0) {
      s.totalShipments = s.totalOk + s.totalMissing + s.totalCrossed + s.totalUnmanifested + s.totalSurplus;
    }
  }

  return [...map.values()];
}

// ── Agregaciones ──────────────────────────────────────────────────────────────

interface DailyStat {
  date: string;
  husAuditados: number;
  husConDesvio: number;
  pctDesvio: number;
  shipments: number;
  faltantes: number;
  cruzados: number;
  sinManifestar: number;
  pctErrores: number;
}

function computeDaily(hus: HuSummary[]): DailyStat[] {
  const map = new Map<string, DailyStat>();
  for (const h of hus) {
    if (!map.has(h.date)) {
      map.set(h.date, { date: h.date, husAuditados: 0, husConDesvio: 0, pctDesvio: 0, shipments: 0, faltantes: 0, cruzados: 0, sinManifestar: 0, pctErrores: 0 });
    }
    const d = map.get(h.date)!;
    d.husAuditados++;
    if (h.hasDeviation) d.husConDesvio++;
    d.shipments    += h.totalShipments;
    d.faltantes    += h.totalMissing;
    d.cruzados     += h.totalCrossed;
    d.sinManifestar += h.totalUnmanifested;
  }
  for (const d of map.values()) {
    d.pctDesvio  = d.husAuditados > 0 ? +((d.husConDesvio / d.husAuditados) * 100).toFixed(2) : 0;
    const errors = d.faltantes + d.cruzados + d.sinManifestar;
    d.pctErrores = d.shipments > 0 ? +((errors / d.shipments) * 100).toFixed(2) : 0;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

interface SubcaStat {
  subca: string;
  husAuditados: number;
  shipments: number;
  faltantes: number;
  cruzados: number;
  sinManifestar: number;
  totalOk: number;
}

function computeSubca(hus: HuSummary[]): SubcaStat[] {
  const map = new Map<string, SubcaStat>();
  for (const h of hus) {
    if (!map.has(h.subca)) {
      map.set(h.subca, { subca: h.subca, husAuditados: 0, shipments: 0, faltantes: 0, cruzados: 0, sinManifestar: 0, totalOk: 0 });
    }
    const s = map.get(h.subca)!;
    s.husAuditados++;
    s.shipments    += h.totalShipments;
    s.faltantes    += h.totalMissing;
    s.cruzados     += h.totalCrossed;
    s.sinManifestar += h.totalUnmanifested;
    s.totalOk      += h.totalOk;
  }
  return [...map.values()].sort((a, b) => (b.faltantes + b.cruzados + b.sinManifestar) - (a.faltantes + a.cruzados + a.sinManifestar));
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PreviewPanel() {
  const { isAdmin } = useAuth();
  const router      = useRouter();

  React.useEffect(() => {
    if (!isAdmin) router.replace('/dashboard');
  }, [isAdmin, router]);

  const [filterSite,  setFilterSite]  = useState('');
  const [filterDate,  setFilterDate]  = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterSubca, setFilterSubca] = useState('');

  const { rows, loading, error } = useJsonDashboardData();

  // Filtrar filas crudas
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterSite  && r.site !== filterSite) return false;
      if (filterDate  && r.FECHA !== filterDate) return false;
      if (filterShift) {
        const t = (r.TURNO ?? '').replace('.', '').toUpperCase();
        if (t !== filterShift) return false;
      }
      if (filterSubca && !(r.SUBCA ?? '').toLowerCase().includes(filterSubca.toLowerCase())) return false;
      return true;
    });
  }, [rows, filterSite, filterDate, filterShift, filterSubca]);

  // Construir resúmenes por HU
  const huSummaries = useMemo(() => buildHuSummaries(filteredRows), [filteredRows]);

  // Totales generales
  const totals = useMemo(() => ({
    totalHus:          huSummaries.length,
    totalShipments:    huSummaries.reduce((s, h) => s + h.totalShipments, 0),
    totalMissing:      huSummaries.reduce((s, h) => s + h.totalMissing, 0),
    totalCrossed:      huSummaries.reduce((s, h) => s + h.totalCrossed, 0),
    totalUnmanifested: huSummaries.reduce((s, h) => s + h.totalUnmanifested, 0),
    husWithDeviation:  huSummaries.filter((h) => h.hasDeviation).length,
  }), [huSummaries]);

  const dailyStats = useMemo(() => computeDaily(huSummaries),  [huSummaries]);
  const subcaStats = useMemo(() => computeSubca(huSummaries),  [huSummaries]);

  const hasFilters = filterDate || filterShift || filterSubca;

  if (!isAdmin) return null;

  return (
    <div className="space-y-8">

      {/* Banner de vista de prueba */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <FlaskConical size={16} className="text-amber-500 shrink-0" />
        <p className="text-amber-700 text-sm">
          <span className="font-semibold">Vista de prueba — </span>
          Datos del Excel importado ({rows.length.toLocaleString()} filas). Solo visible para administradores.
        </p>
      </div>

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

      {/* Filtros secundarios */}
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
              onClick={() => { setFilterDate(''); setFilterShift(''); setFilterSubca(''); }}
              className="text-xs text-zinc-400 hover:text-red-500 px-3 py-1.5 border border-zinc-200 rounded-lg hover:border-red-200 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Carga / error */}
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
              value={totals.totalHus.toLocaleString()}
              icon={<ClipboardList size={14} />}
            />
            <StatCard
              label="Shipments"
              value={totals.totalShipments.toLocaleString()}
              icon={<BarChart2 size={14} />}
            />
            <StatCard
              label="HUs con desvío"
              value={totals.husWithDeviation.toLocaleString()}
              sub={totals.totalHus > 0 ? `${((totals.husWithDeviation / totals.totalHus) * 100).toFixed(1)}%` : '0%'}
              colorClass={totals.husWithDeviation > 0 ? 'text-red-600' : 'text-zinc-900'}
              icon={<TrendingDown size={14} />}
            />
            <StatCard
              label="Faltantes"
              value={totals.totalMissing.toLocaleString()}
              colorClass={totals.totalMissing > 0 ? 'text-red-600' : 'text-zinc-900'}
              icon={<PackageX size={14} />}
            />
            <StatCard
              label="Cruzados"
              value={totals.totalCrossed.toLocaleString()}
              colorClass={totals.totalCrossed > 0 ? 'text-yellow-600' : 'text-zinc-900'}
              icon={<PackagePlus size={14} />}
            />
            <StatCard
              label="Sin manifestar"
              value={totals.totalUnmanifested.toLocaleString()}
              colorClass={totals.totalUnmanifested > 0 ? 'text-orange-500' : 'text-zinc-900'}
              icon={<PackageX size={14} />}
            />
          </div>

          {/* Gráficos por fecha */}
          {dailyStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">HUs auditados vs con desvío por día</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyStats} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="husAuditados"  name="HUs auditados"  fill="#6366f1" radius={[3,3,0,0]} />
                    <Bar dataKey="husConDesvio"  name="Con desvío"     fill="#ef4444" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">% HUs con desvío por día</p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyStats} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line dataKey="pctDesvio" name="% desvío" stroke="#ef4444" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">Errores por tipo por día</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyStats} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="faltantes"    name="Faltantes"      fill="#ef4444" radius={[3,3,0,0]} />
                    <Bar dataKey="cruzados"     name="Cruzados"       fill="#eab308" radius={[3,3,0,0]} />
                    <Bar dataKey="sinManifestar" name="Sin manifestar" fill="#f97316" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-700 mb-4">% Envíos con errores por día</p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyStats} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line dataKey="pctErrores" name="% con errores" stroke="#f97316" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabla por fecha */}
          {dailyStats.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Estadísticas por fecha</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-800 text-zinc-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">Fecha</th>
                      <th className="px-3 py-2.5 text-right font-semibold">HUs auditados</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Con desvío</th>
                      <th className="px-3 py-2.5 text-right font-semibold">% desvío</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Shipments</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Faltantes</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Cruzados</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Sin manifestar</th>
                      <th className="px-3 py-2.5 text-right font-semibold">% errores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {dailyStats.map((d) => (
                      <tr key={d.date} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 font-medium text-zinc-800">{d.date}</td>
                        <td className="px-3 py-2 text-right">{d.husAuditados}</td>
                        <td className="px-3 py-2 text-right">{d.husConDesvio}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${d.pctDesvio > 50 ? 'text-red-600' : 'text-zinc-700'}`}>
                          {d.pctDesvio.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right">{d.shipments.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-red-600">{d.faltantes}</td>
                        <td className="px-3 py-2 text-right text-yellow-600">{d.cruzados}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{d.sinManifestar}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${d.pctErrores > 5 ? 'text-red-600' : 'text-zinc-700'}`}>
                          {d.pctErrores.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 border-t-2 border-zinc-300 font-semibold text-xs">
                    <tr>
                      <td className="px-3 py-2 text-zinc-700">Total</td>
                      <td className="px-3 py-2 text-right">{totals.totalHus}</td>
                      <td className="px-3 py-2 text-right">{totals.husWithDeviation}</td>
                      <td className="px-3 py-2 text-right">
                        {totals.totalHus > 0 ? ((totals.husWithDeviation / totals.totalHus) * 100).toFixed(2) : '0.00'}%
                      </td>
                      <td className="px-3 py-2 text-right">{totals.totalShipments.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-red-600">{totals.totalMissing}</td>
                      <td className="px-3 py-2 text-right text-yellow-600">{totals.totalCrossed}</td>
                      <td className="px-3 py-2 text-right text-orange-600">{totals.totalUnmanifested}</td>
                      <td className="px-3 py-2 text-right">
                        {totals.totalShipments > 0
                          ? (((totals.totalMissing + totals.totalCrossed + totals.totalUnmanifested) / totals.totalShipments) * 100).toFixed(2)
                          : '0.00'}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Tabla por Sub-CA */}
          {subcaStats.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Estadísticas por Sub-CA</h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-800 text-zinc-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">Sub-CA</th>
                      <th className="px-3 py-2.5 text-right font-semibold">HUs auditados</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Shipments</th>
                      <th className="px-3 py-2.5 text-right font-semibold">OK</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Faltantes</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Cruzados</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Sin manifestar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {subcaStats.map((s) => (
                      <tr key={s.subca} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 font-medium text-zinc-800">{s.subca || '—'}</td>
                        <td className="px-3 py-2 text-right">{s.husAuditados}</td>
                        <td className="px-3 py-2 text-right">{s.shipments.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{s.totalOk}</td>
                        <td className="px-3 py-2 text-right text-red-600">{s.faltantes}</td>
                        <td className="px-3 py-2 text-right text-yellow-600">{s.cruzados}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{s.sinManifestar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
