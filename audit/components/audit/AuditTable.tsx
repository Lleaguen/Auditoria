'use client';

import React, { useState, useMemo } from 'react';
import type { AuditResult, ScannedShipment, ShipmentScanStatus } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import {
  ChevronDown,
  ChevronUp,
  Users,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
} from 'lucide-react';

// ── Tipos de ordenamiento ────────────────────────────────────────────────────

type SortField = 'shipmentId' | 'subca' | 'status' | 'statusDescription';
type SortDir   = 'asc' | 'desc';

// Prioridad de status para el orden por defecto
const STATUS_PRIORITY: Record<ShipmentScanStatus, number> = {
  missing:      0,
  crossed:      1,
  unmanifested: 2,
  ok:           3,
};

// ── Filtros rápidos ──────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: ShipmentScanStatus | 'all'; label: string; color: string }[] = [
  { value: 'all',          label: 'Todos',           color: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  { value: 'missing',      label: 'Faltantes',       color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'crossed',      label: 'Cruzados',        color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'unmanifested', label: 'Sin manifestar',  color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'ok',           label: 'OK',              color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

// ── Componente principal ─────────────────────────────────────────────────────

interface AuditTableProps {
  audit: AuditResult;
}

export default function AuditTable({ audit }: AuditTableProps) {
  const [showAll,    setShowAll]    = useState(false);
  const [filter,     setFilter]     = useState<ShipmentScanStatus | 'all'>('all');
  const [search,     setSearch]     = useState('');
  const [sortField,  setSortField]  = useState<SortField>('status');
  const [sortDir,    setSortDir]    = useState<SortDir>('asc');

  const hasIssues =
    audit.totalMissing > 0 || audit.totalCrossed > 0 || audit.totalUnmanifested > 0;

  // ── Ordenamiento ──────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Datos filtrados + ordenados ───────────────────────────────────────────

  const processed = useMemo(() => {
    let rows = [...audit.results];

    // Filtro por estado
    if (filter !== 'all') {
      rows = rows.filter((r) => r.status === filter);
    }

    // Búsqueda por shipment ID o sub-ca
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.shipmentId.toLowerCase().includes(q) ||
          r.subca.toLowerCase().includes(q) ||
          (r.crossedFromHu ?? '').toLowerCase().includes(q) ||
          r.statusDescription.toLowerCase().includes(q)
      );
    }

    // Ordenamiento
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'status':
          cmp = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
          break;
        case 'shipmentId':
          cmp = a.shipmentId.localeCompare(b.shipmentId);
          break;
        case 'subca':
          cmp = a.subca.localeCompare(b.subca);
          break;
        case 'statusDescription':
          cmp = a.statusDescription.localeCompare(b.statusDescription);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [audit.results, filter, search, sortField, sortDir]);

  const visible = showAll ? processed : processed.slice(0, 100);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Totales ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <SummaryCard label="Sistema"        value={audit.totalSystem}        color="text-zinc-700"    bg="bg-zinc-50"    border="border-zinc-200" />
        <SummaryCard label="Bipeados"       value={audit.totalScanned}       color="text-indigo-700"  bg="bg-indigo-50"  border="border-indigo-200" />
        <SummaryCard label="OK"             value={audit.totalOk}            color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
        <SummaryCard label="Faltantes"      value={audit.totalMissing}       color="text-red-700"     bg="bg-red-50"     border="border-red-200" />
        <SummaryCard label="Cruzados"       value={audit.totalCrossed}       color="text-yellow-700"  bg="bg-yellow-50"  border="border-yellow-200" />
        <SummaryCard label="Sin manifestar" value={audit.totalUnmanifested}  color="text-orange-700"  bg="bg-orange-50"  border="border-orange-200" />
      </div>

      {/* ── Alertas ─────────────────────────────────────────────────── */}
      {audit.totalCrossed > 0 && (
        <AlertBanner
          color="yellow"
          icon={<AlertTriangle size={14} />}
          text={
            <>
              <strong>{audit.totalCrossed} cruzado{audit.totalCrossed > 1 ? 's' : ''}</strong>
              {' '}— pertenecen a otro HU:{' '}
              <span className="font-mono">{audit.crossedHus.join(', ')}</span>
            </>
          }
        />
      )}
      {audit.totalUnmanifested > 0 && (
        <AlertBanner
          color="orange"
          icon={<AlertTriangle size={14} />}
          text={
            <>
              <strong>{audit.totalUnmanifested} sin manifestar</strong>
              {' '}— bipeados pero sin registro en el dataset.
            </>
          }
        />
      )}

      {/* ── Usuarios de armado ──────────────────────────────────────── */}
      {audit.assemblyUsers.length > 0 && (
        <div className="flex items-start gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-sm">
          <Users size={14} className="text-zinc-400 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-zinc-500 font-medium mr-1">Armado por:</span>
            {audit.assemblyUsers.map((u) => (
              <span key={u} className="bg-zinc-100 text-zinc-700 text-xs font-mono px-2 py-0.5 rounded-md border border-zinc-200">
                {u}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Controles: filtros + búsqueda + ordenamiento ────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtros rápidos por estado */}
        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-xl p-1">
          <Filter size={12} className="text-zinc-400 ml-1" />
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === 'all'
                ? audit.results.length
                : audit.results.filter((r) => r.status === opt.value).length;
            const active = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setFilter(opt.value); setShowAll(false); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  active ? opt.color + ' shadow-sm' : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-100'
                }`}
              >
                {opt.label}
                {count > 0 && (
                  <span className={`ml-1 text-[10px] ${active ? 'opacity-70' : 'text-zinc-400'}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Búsqueda */}
        <div className="flex items-center gap-1.5 border border-zinc-200 rounded-xl px-3 py-1.5 bg-white flex-1 min-w-[180px]">
          <Search size={12} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
            placeholder="Buscar por ID, sub-CA, HU origen..."
            className="text-xs bg-transparent outline-none w-full text-zinc-700 placeholder:text-zinc-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-zinc-300 hover:text-zinc-500 text-xs leading-none">✕</button>
          )}
        </div>

        {/* Resultados */}
        <span className="text-xs text-zinc-400 whitespace-nowrap">
          {processed.length} resultado{processed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300">
                <SortHeader field="shipmentId" label="Shipment ID"       currentField={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader field="subca"      label="Sub-CA"            currentField={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader field="status"     label="Estado"            currentField={sortField} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left font-semibold">Presencia</th>
                <SortHeader field="statusDescription" label="Status Description" currentField={sortField} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left font-semibold">Despachado</th>
                <th className="px-4 py-3 text-left font-semibold">Usuario bipeo</th>
                <th className="px-4 py-3 text-left font-semibold">Autorización</th>
                <th className="px-4 py-3 text-left font-semibold">HU Origen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {visible.length > 0 ? (
                visible.map((r) => (
                  <ResultRow key={`${r.shipmentId}-${r.status}`} result={r} audit={audit} />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-400 text-sm">
                    No se encontraron resultados para el filtro aplicado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ver más / menos */}
      {processed.length > 100 && (
        <button
          onClick={() => setShowAll((p) => !p)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {showAll
            ? <><ChevronUp size={13} /> Mostrar menos</>
            : <><ChevronDown size={13} /> Ver todos ({processed.length})</>}
        </button>
      )}

      {/* Auditoría perfecta */}
      {!hasIssues && (
        <div className="text-center py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <p className="text-emerald-700 font-semibold text-sm">✓ Auditoría perfecta — sin desvíos</p>
        </div>
      )}
    </div>
  );
}

// ── Fila de resultado ────────────────────────────────────────────────────────

function ResultRow({ result, audit }: { result: ScannedShipment; audit: AuditResult }) {
  const inSystem  = audit.systemShipments.includes(result.shipmentId);
  const inScanned = audit.scannedShipments.includes(result.shipmentId);

  const rowBg =
    result.status === 'missing'       ? 'bg-red-50/60'
    : result.status === 'crossed'     ? 'bg-yellow-50/60'
    : result.status === 'unmanifested' ? 'bg-orange-50/60'
    : '';

  return (
    <tr className={`${rowBg} hover:brightness-[0.97] transition-all`}>
      <td className="px-4 py-2.5 font-mono text-zinc-800 text-[11px] whitespace-nowrap">{result.shipmentId}</td>
      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">{result.subca}</td>
      <td className="px-4 py-2.5 whitespace-nowrap"><Badge variant={result.status} /></td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${inSystem ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-100 text-zinc-300'}`}>SIS</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${inScanned ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-300'}`}>BIP</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-zinc-400 max-w-[180px] truncate text-[11px]" title={result.statusDescription}>
        {result.statusDescription || '—'}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {result.dispatched
          ? <Badge variant="dispatched" label="Sí" />
          : <span className="text-zinc-300 text-[11px]">No</span>}
      </td>
      <td className="px-4 py-2.5 text-zinc-500 text-[11px] font-mono whitespace-nowrap">
        {result.outboundUserIds
          ? result.outboundUserIds.replace(/[\[\]]/g, '').split(',').map((u) => u.trim()).filter(Boolean).join(', ')
          : '—'}
      </td>
      <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap text-[11px]">
        {result.labelingAuthorizationDate || '—'}
      </td>
      <td className="px-4 py-2.5 font-mono text-yellow-600 text-[11px] whitespace-nowrap">
        {result.crossedFromHu || '—'}
      </td>
    </tr>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function SortHeader({
  field,
  label,
  currentField,
  dir,
  onSort,
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = field === currentField;
  return (
    <th className="px-4 py-3 text-left font-semibold">
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-white text-zinc-400 transition-colors group"
      >
        <span className={active ? 'text-white' : ''}>{label}</span>
        {active ? (
          dir === 'asc' ? <ArrowUp size={11} className="text-indigo-400" /> : <ArrowDown size={11} className="text-indigo-400" />
        ) : (
          <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-70" />
        )}
      </button>
    </th>
  );
}

function SummaryCard({
  label, value, color, bg, border,
}: {
  label: string; value: number; color: string; bg: string; border: string;
}) {
  return (
    <div className={`${bg} border ${border} rounded-xl px-3 py-2.5`}>
      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function AlertBanner({
  color,
  icon,
  text,
}: {
  color: 'yellow' | 'orange';
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  const styles = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };
  return (
    <div className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 text-xs ${styles[color]}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <p>{text}</p>
    </div>
  );
}
