'use client';

import type { DailyStats } from '@/lib/types';

interface DailyStatsTableProps {
  data: DailyStats[];
}

export default function DailyStatsTable({ data }: DailyStatsTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-zinc-400 text-sm text-center py-8">
        No hay auditorías guardadas aún.
      </p>
    );
  }

  const totals = data.reduce(
    (acc, d) => ({
      totalHusAudited:       acc.totalHusAudited + d.totalHusAudited,
      husWithDeviation:      acc.husWithDeviation + d.husWithDeviation,
      totalShipmentsAudited: acc.totalShipmentsAudited + d.totalShipmentsAudited,
      totalMissing:          acc.totalMissing + d.totalMissing,
      totalCrossed:          acc.totalCrossed + d.totalCrossed,
      totalUnmanifested:     acc.totalUnmanifested + d.totalUnmanifested,
      totalDamaged:          acc.totalDamaged + d.totalDamaged,
    }),
    {
      totalHusAudited: 0,
      husWithDeviation: 0,
      totalShipmentsAudited: 0,
      totalMissing: 0,
      totalCrossed: 0,
      totalUnmanifested: 0,
      totalDamaged: 0,
    }
  );

  const totalErrors = totals.totalMissing + totals.totalCrossed + totals.totalUnmanifested;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
      <table className="w-full text-xs">
        <thead className="bg-zinc-800 text-zinc-200 sticky top-0">
          <tr>
            <th className="px-3 py-2.5 text-left font-semibold">Fecha</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q HU Auditados</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q HU con Desvío</th>
            <th className="px-3 py-2.5 text-right font-semibold">% HU con Desvío</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Envíos Auditados</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Faltantes</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Cruzados</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Sin Manifestar</th>
            <th className="px-3 py-2.5 text-right font-semibold">Q Dañados</th>
            <th className="px-3 py-2.5 text-right font-semibold">% Envíos con Errores</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {data.map((d) => {
            const rowErrors = d.totalMissing + d.totalCrossed + d.totalUnmanifested;
            return (
              <tr key={d.date} className="hover:bg-zinc-50">
                <td className="px-3 py-2 font-medium text-zinc-800">{d.date}</td>
                <td className="px-3 py-2 text-right text-zinc-700">{d.totalHusAudited}</td>
                <td className="px-3 py-2 text-right text-zinc-700">{d.husWithDeviation}</td>
                <td className={`px-3 py-2 text-right font-semibold ${d.percentHusWithDeviation > 50 ? 'text-red-600' : 'text-zinc-700'}`}>
                  {d.percentHusWithDeviation.toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-right text-zinc-700">{d.totalShipmentsAudited}</td>
                <td className="px-3 py-2 text-right text-red-600">{d.totalMissing}</td>
                <td className="px-3 py-2 text-right text-yellow-600">{d.totalCrossed}</td>
                <td className="px-3 py-2 text-right text-orange-600">{d.totalUnmanifested}</td>
                <td className="px-3 py-2 text-right text-zinc-500">{d.totalDamaged}</td>
                <td className={`px-3 py-2 text-right font-semibold ${d.percentWithErrors > 5 ? 'text-red-600' : 'text-zinc-700'}`}>
                  {d.percentWithErrors.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-zinc-100 border-t-2 border-zinc-300 font-semibold">
          <tr>
            <td className="px-3 py-2 text-zinc-700">Suma total</td>
            <td className="px-3 py-2 text-right text-zinc-800">{totals.totalHusAudited}</td>
            <td className="px-3 py-2 text-right text-zinc-800">{totals.husWithDeviation}</td>
            <td className="px-3 py-2 text-right text-zinc-800">
              {totals.totalHusAudited > 0
                ? ((totals.husWithDeviation / totals.totalHusAudited) * 100).toFixed(2)
                : '0.00'}%
            </td>
            <td className="px-3 py-2 text-right text-zinc-800">{totals.totalShipmentsAudited}</td>
            <td className="px-3 py-2 text-right text-red-600">{totals.totalMissing}</td>
            <td className="px-3 py-2 text-right text-yellow-600">{totals.totalCrossed}</td>
            <td className="px-3 py-2 text-right text-orange-600">{totals.totalUnmanifested}</td>
            <td className="px-3 py-2 text-right text-zinc-800">{totals.totalDamaged}</td>
            <td className="px-3 py-2 text-right text-zinc-800">
              {totals.totalShipmentsAudited > 0
                ? ((totalErrors / totals.totalShipmentsAudited) * 100).toFixed(2)
                : '0.00'}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
