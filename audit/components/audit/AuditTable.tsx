'use client';

import React, { useState } from 'react';
import type { AuditResult, ScannedShipment } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

  return (
    <div className="space-y-3">
      {/* Encabezado resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <SummaryPill label="Por sistema" value={audit.totalSystem} color="text-zinc-700" />
        <SummaryPill label="OK" value={audit.totalOk} color="text-emerald-700" />
        <SummaryPill label="Faltantes" value={audit.totalMissing} color="text-red-700" />
        <SummaryPill label="Sobrantes" value={audit.totalSurplus} color="text-orange-700" />
        {audit.totalCrossed > 0 && (
          <SummaryPill label="Cruzados" value={audit.totalCrossed} color="text-yellow-700" />
        )}
      </div>

      {/* Info de armado */}
      {audit.assemblyUsers.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-1">
          <span className="font-semibold text-zinc-600">Usuarios de armado:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {audit.assemblyUsers.map((u) => (
              <span
                key={u}
                className="bg-white border border-zinc-300 rounded-full px-2 py-0.5 text-zinc-700"
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      )}

      {audit.crossedHus.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
          <span className="font-semibold text-yellow-700">HUs de sub-CA encontrados:</span>{' '}
          {audit.crossedHus.join(', ')}
        </div>
      )}

      {/* Tabla principal */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-zinc-800 text-zinc-200 sticky top-0">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">Shipment ID</th>
              <th className="px-3 py-2.5 text-left font-semibold">Sub-CA</th>
              <th className="px-3 py-2.5 text-left font-semibold">Estado</th>
              <th className="px-3 py-2.5 text-left font-semibold">Bipeado vs Sistema</th>
              <th className="px-3 py-2.5 text-left font-semibold">Status Description</th>
              <th className="px-3 py-2.5 text-left font-semibold">Despachado</th>
              <th className="px-3 py-2.5 text-left font-semibold">Usuario bipeo</th>
              <th className="px-3 py-2.5 text-left font-semibold">Fecha autorización</th>
              <th className="px-3 py-2.5 text-left font-semibold">HU Origen (cruzado)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visible.map((r) => (
              <ResultRow key={`${r.shipmentId}-${r.status}`} result={r} audit={audit} />
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > 50 && (
        <button
          onClick={() => setShowAll((p) => !p)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          {showAll ? (
            <>
              <ChevronUp size={13} /> Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Ver todos ({sorted.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ResultRow({
  result,
  audit,
}: {
  result: ScannedShipment;
  audit: AuditResult;
}) {
  const inSystem = audit.systemShipments.includes(result.shipmentId);
  const inScanned = audit.scannedShipments.includes(result.shipmentId);

  const rowBg =
    result.status === 'missing'
      ? 'bg-red-50'
      : result.status === 'surplus'
      ? 'bg-orange-50'
      : result.status === 'crossed'
      ? 'bg-yellow-50'
      : 'bg-white';

  return (
    <tr className={`${rowBg} hover:brightness-95 transition-all`}>
      <td className="px-3 py-2 font-mono text-zinc-800">{result.shipmentId}</td>
      <td className="px-3 py-2 text-zinc-600">{result.subca}</td>
      <td className="px-3 py-2">
        <Badge variant={result.status} />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className={inSystem ? 'text-emerald-600' : 'text-zinc-300'}>Sistema</span>
          <span className="text-zinc-300">/</span>
          <span className={inScanned ? 'text-blue-600' : 'text-zinc-300'}>Bipeado</span>
        </div>
      </td>
      <td className="px-3 py-2 text-zinc-500 max-w-[200px] truncate" title={result.statusDescription}>
        {result.statusDescription || '—'}
      </td>
      <td className="px-3 py-2">
        {result.dispatched ? (
          <Badge variant="dispatched" label="SÍ" />
        ) : (
          <span className="text-zinc-300">No</span>
        )}
      </td>
      <td className="px-3 py-2 text-zinc-600 text-xs">{result.labelingLastPrintUser || '—'}</td>
      <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">
        {result.labelingAuthorizationDate || '—'}
      </td>
      <td className="px-3 py-2 font-mono text-yellow-700 text-xs">
        {result.crossedFromHu || '—'}
      </td>
    </tr>
  );
}

function SummaryPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex items-center gap-2">
      <span className={`font-bold text-base ${color}`}>{value}</span>
      <span className="text-zinc-400">{label}</span>
    </div>
  );
}
