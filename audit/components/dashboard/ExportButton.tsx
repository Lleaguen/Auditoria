'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DailyStats } from '@/lib/types';

interface ExportButtonProps {
  data: DailyStats[];
}

export default function ExportButton({ data }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (data.length === 0) return;
    setLoading(true);

    try {
      const rows = data.map((d) => ({
        'FECHA':                          d.date,
        'Q HU AUDITADOS':                 d.totalHusAudited,
        'Q HU CON DESVIOS':               d.husWithDeviation,
        '% DE HU CON DESVIOS':            `${d.percentHusWithDeviation.toFixed(2)}%`,
        'Q ENVIOS TOT AUDITADOS':         d.totalShipmentsAudited,
        'Q ENVIOS FALTANTES':             d.totalMissing,
        'Q DE ENVIOS CRUZADOS':           d.totalCrossed,
        'Q DE ENVIOS SIN MANIFESTAR':     d.totalUnmanifested,
        'Q DE ENVIOS DAÑADOS':            d.totalDamaged,
        '% DE ENVIOS CON ERRORES DETECT': `${d.percentWithErrors.toFixed(2)}%`,
      }));

      // Fila de totales
      const totalHus          = data.reduce((s, d) => s + d.totalHusAudited, 0);
      const totalDesvios      = data.reduce((s, d) => s + d.husWithDeviation, 0);
      const totalShipments    = data.reduce((s, d) => s + d.totalShipmentsAudited, 0);
      const totalMissing      = data.reduce((s, d) => s + d.totalMissing, 0);
      const totalCrossed      = data.reduce((s, d) => s + d.totalCrossed, 0);
      const totalUnmanifested = data.reduce((s, d) => s + d.totalUnmanifested, 0);
      const totalDamaged      = data.reduce((s, d) => s + d.totalDamaged, 0);
      const totalErrors       = totalMissing + totalCrossed + totalUnmanifested;

      rows.push({
        'FECHA':                          'TOTAL',
        'Q HU AUDITADOS':                 totalHus,
        'Q HU CON DESVIOS':               totalDesvios,
        '% DE HU CON DESVIOS':            totalHus > 0
          ? `${((totalDesvios / totalHus) * 100).toFixed(2)}%`
          : '0.00%',
        'Q ENVIOS TOT AUDITADOS':         totalShipments,
        'Q ENVIOS FALTANTES':             totalMissing,
        'Q DE ENVIOS CRUZADOS':           totalCrossed,
        'Q DE ENVIOS SIN MANIFESTAR':     totalUnmanifested,
        'Q DE ENVIOS DAÑADOS':            totalDamaged,
        '% DE ENVIOS CON ERRORES DETECT': totalShipments > 0
          ? `${((totalErrors / totalShipments) * 100).toFixed(2)}%`
          : '0.00%',
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 12 },
        { wch: 16 },
        { wch: 17 },
        { wch: 20 },
        { wch: 24 },
        { wch: 20 },
        { wch: 24 },
        { wch: 26 },
        { wch: 20 },
        { wch: 28 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');

      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `reporte_auditoria_${fecha}.xlsx`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading || data.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      Exportar Excel
    </button>
  );
}
