'use client';

import React, { useState } from 'react';
import type { AuditResult, ScannedShipment } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { ChevronDown, ChevronUp, Users, AlertTriangle } from 'lucide-react';

interface AuditTableProps {
  audit: AuditResult;
}

const STATUS_ORDER = ['missing', 'crossed', 'surplus', 'ok'] as const;

function sortResults(results: ScannedShipment[]): ScannedShipment[] {
  return [...results].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status as typeof STATUS_ORDER[number]) -
      STATUS_ORDER.indexOf(b.status as typeof STATUS_ORDER[number])
  );
}

export default function AuditTable({ audit }: AuditTableProps) {
  const [showAll, setShowAll] = useState(false);
  const sorted = sortResults(audit.results);
  const visible = showAll ? sorted : sorted.slice(0, 50);

  const hasIssues = audit.totalMissing > 0 || audit.totalSurplus > 0 || audit.totalCrossed > 0;

  return (
    <div className="space-y-4">
      {/* Resumen de totales */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Sistema"   value={audit.totalSystem}   color="text-zinc-700"    bg="bg-zinc-50"     border="border-zinc-200" />
        <SummaryCard label="Bipeados"  value={audit.totalScanned}  color="text-indigo-700"  bg="bg-indigo-50"   border="border-indigo-200" />
        <SummaryCard label="OK"        value={audit.totalOk}       color="text-emerald-700" bg="bg-emerald-50"  border="border-emerald-200" />
        <SummaryCard label="Faltantes" value={audit.totalMissing}  color="text-red-700"     bg="bg-red-50"      border="border-red-200" />
        <SummaryCard label="Sobrantes" value={audit.totalSurplus}  color="text-orange-700"  bg="bg-orange-50"   border="border-orange-200" />
      </div>

      {/* Alertas contextuales */}
      {audit.totalCrossed > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700">
            <span className="font-semibold">{audit.totalCrossed} cruzados</span> — HUs de sub-CA:{' '}
            <span className="font-mono">{audit.crossedHus.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Usuarios de armado */}
      {audit.assemblyUsers.length > 0 && (
        <div className="flex items-start gap-3 bg-white border border-zinc-200/80 rounded-xl px-4 py-3 shadow-sm">
          <Users size={14} className="text-zinc-400 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-zinc-500 font-medium mr-1">Armado por:</span>
            {audit.assemblyUsers.map((u) => (
              <span
                key={u}
                className="bg-zinc-100 text-zinc-700 text-xs font-mono px-2 py-0.5 rounded-md border border-zinc-200"
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300">
                <th className="px-4 py-3 text-left font-semibold">Shipment ID</th>
                <th className="px-4 py-3 text-left font-semibold">Sub-CA</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Presencia</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Despachado</th>
                <th className="px-4 py-3 text-left font-semibold">Usuario armado</th>
                <th className="px-4 py-3 text-left font-semibold">Autorización</th>
                <th className="px-4 py-3 text-left font-semibold">HU Origen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {visible.map((r) => (
                <ResultRow key={`${r.shipmentId}-${r.status}`} result={r} audit={audit} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sorted.length > 50 && (
        <button
          onClick={() => setShowAll((p) => !p)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {showAll ? <><ChevronUp size={13} /> Mostrar menos</> : <><ChevronDown size={13} /> Ver todos ({sorted.length})</>}
        </button>
      )}

      {!hasIssues && (
        <div className="text-center py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <p className="text-emerald-700 font-semibold text-sm">✓ Auditoría perfecta — sin desvíos</p>
        </div>
      )}
    </div>
  );
}

function ResultRow({ result, audit }: { result: ScannedShipment; audit: AuditResult }) {
  const inSystem  = audit.systemShipments.includes(result.shipmentId);
  const inScanned = audit.scannedShipments.includes(result.shipmentId);

  const rowBg =
    result.status === 'missing' ? 'bg-red-50/60'
    : result.status === 'surplus' ? 'bg-orange-50/60'
    : result.status === 'crossed' ? 'bg-amber-50/60'
    : '';

  return (
    <tr className={`${rowBg} hover:brightness-[0.97]`}>
      <td className="px-4 py-2.5 font-mono text-zinc-800 text-[11px]">{result.shipmentId}</td>
      <td className="px-4 py-2.5 text-zinc-500">{result.subca}</td>
      <td className="px-4 py-2.5"><Badge variant={result.status} /></td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${inSystem ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-100 text-zinc-300'}`}>
            SIS
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${inScanned ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-300'}`}>
            BIP
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-zinc-400 max-w-[180px] truncate text-[11px]" title={result.statusDescription}>
        {result.statusDescription || '—'}
      </td>
      <td className="px-4 py-2.5">
        {result.dispatched
          ? <Badge variant="dispatched" label="Sí" />
          : <span className="text-zinc-300 text-[11px]">No</span>
        }
      </td>
      <td className="px-4 py-2.5 text-zinc-500 text-[11px] font-mono">
        {result.outboundUserIds
          ? result.outboundUserIds.replace(/[\[\]]/g, '').split(',').map(u => u.trim()).filter(Boolean).join(', ')
          : '—'}
      </td>
      <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap text-[11px]">{result.labelingAuthorizationDate || '—'}</td>
      <td className="px-4 py-2.5 font-mono text-amber-600 text-[11px]">{result.crossedFromHu || '—'}</td>
    </tr>
  );
}

function SummaryCard({
  label, value, color, bg, border,
}: {
  label: string; value: number; color: string; bg: string; border: string;
}) {
  return (
    <div className={`${bg} border ${border} rounded-xl px-4 py-3`}>
      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
