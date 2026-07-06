'use client';

import type { AuditResult } from '@/lib/types';

interface SubcaRow {
  subca: string;
  husAuditados: number;
  totalShipments: number;
  totalMissing: number;
  totalCrossed: number;
  totalUnmanifested: number;
  totalOk: number;
}

interface SubcaTableProps {
  data: SubcaRow[];
  audits: AuditResult[];
}

export default function SubcaTable({ data, audits }: SubcaTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-zinc-400 text-sm text-center py-8">
        Sin datos de sub-CA aún.
      </p>
    );
  }

  // Agrupa por sub-ca → usuario de armado
  type UserStats = { hus: number; shipments: number; missing: number; crossed: number; unmanifested: number };
  const usersBySubca = new Map<string, Map<string, UserStats>>();

  for (const audit of audits) {
    for (const user of audit.assemblyUsers) {
      if (!usersBySubca.has(audit.subca)) usersBySubca.set(audit.subca, new Map());
      const map = usersBySubca.get(audit.subca)!;
      const s = map.get(user) ?? { hus: 0, shipments: 0, missing: 0, crossed: 0, unmanifested: 0 };
      s.hus          += 1;
      s.shipments    += audit.totalSystem;
      s.missing      += audit.totalMissing;
      s.crossed      += audit.totalCrossed;
      s.unmanifested += audit.totalUnmanifested;
      map.set(user, s);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
      <table className="w-full text-xs">
        <thead className="bg-zinc-800 text-zinc-200 sticky top-0">
          <tr>
            <th className="px-3 py-2.5 text-left font-semibold">Sub-CA</th>
            <th className="px-3 py-2.5 text-right font-semibold">HUs Auditados</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Faltantes</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Cruzados</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Sin Manifestar</th>
            <th className="px-3 py-2.5 text-right font-semibold">Total Analizados</th>
            <th className="px-3 py-2.5 text-left font-semibold">Usuario de Armado</th>
            <th className="px-3 py-2.5 text-right font-semibold">HUs x Usuario</th>
            <th className="px-3 py-2.5 text-right font-semibold">Faltantes</th>
            <th className="px-3 py-2.5 text-right font-semibold">Cruzados</th>
            <th className="px-3 py-2.5 text-right font-semibold">Sin Manifestar</th>
            <th className="px-3 py-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {data.map((row) => {
            const usersMap = usersBySubca.get(row.subca);
            const userRows = usersMap ? [...usersMap.entries()] : [];

            if (userRows.length === 0) {
              return (
                <tr key={row.subca} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 font-semibold text-zinc-800">{row.subca}</td>
                  <td className="px-3 py-2 text-right">{row.husAuditados}</td>
                  <td className="px-3 py-2 text-right text-red-600">{row.totalMissing}</td>
                  <td className="px-3 py-2 text-right text-yellow-600">{row.totalCrossed}</td>
                  <td className="px-3 py-2 text-right text-orange-600">{row.totalUnmanifested}</td>
                  <td className="px-3 py-2 text-right">{row.totalShipments}</td>
                  <td colSpan={6} className="px-3 py-2 text-zinc-400 text-center">—</td>
                </tr>
              );
            }

            return userRows.map(([user, stats], idx) => (
              <tr
                key={`${row.subca}-${user}`}
                className={`hover:bg-zinc-50 ${idx > 0 ? 'border-t border-dashed border-zinc-100' : ''}`}
              >
                {idx === 0 ? (
                  <>
                    <td className="px-3 py-2 font-semibold text-zinc-800" rowSpan={userRows.length}>{row.subca}</td>
                    <td className="px-3 py-2 text-right" rowSpan={userRows.length}>{row.husAuditados}</td>
                    <td className="px-3 py-2 text-right text-red-600" rowSpan={userRows.length}>{row.totalMissing}</td>
                    <td className="px-3 py-2 text-right text-yellow-600" rowSpan={userRows.length}>{row.totalCrossed}</td>
                    <td className="px-3 py-2 text-right text-orange-600" rowSpan={userRows.length}>{row.totalUnmanifested}</td>
                    <td className="px-3 py-2 text-right" rowSpan={userRows.length}>{row.totalShipments}</td>
                  </>
                ) : null}
                <td className="px-3 py-2 text-zinc-700">{user}</td>
                <td className="px-3 py-2 text-right">{stats.hus}</td>
                <td className="px-3 py-2 text-right text-red-600">{stats.missing}</td>
                <td className="px-3 py-2 text-right text-yellow-600">{stats.crossed}</td>
                <td className="px-3 py-2 text-right text-orange-600">{stats.unmanifested}</td>
                <td className="px-3 py-2 text-right">{stats.shipments}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
