'use client';

import { useState, useEffect } from 'react';

// Estructura exacta de cada fila del Excel + campo site agregado
export interface ExcelRow {
  FECHA: string | null;
  TURNO: string | null;
  'HU A AUDITAR': string | null;
  SUBCA: string | null;
  'SHIPMENTS POR SISTEMA': number | null;
  'SHIPMENTS DESCLOSADOS': number | null;
  FALTANTE: string | number | null;
  BIPEADO: number | null;
  'VS SISTEMA': string | null;
  OBSERVACION: string | null;
  'HU DE SUBCA ENCONTRADO': string | null;
  'USUARIO DE ARMADO': string | null;
  'Q FALTANTE EN HU': number | null;
  'Q SOBRANTE EN HU': number | null;
  'Q CRUZADOS': number | null;
  site: 'ARXCF1' | 'ARXBA3';
}

export interface JsonDashboardState {
  rows: ExcelRow[];
  loading: boolean;
  error: string | null;
}

export function useJsonDashboardData(): JsonDashboardState {
  const [rows, setRows]       = useState<ExcelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${base}/dashboard-data.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ExcelRow[]) => setRows(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { rows, loading, error };
}
