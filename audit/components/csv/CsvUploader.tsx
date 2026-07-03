'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react';
import { parseCSV, normalizeRow } from '@/lib/csv-parser';
import { useAppStore } from '@/lib/store';

export default function CsvUploader() {
  const { state, setCsv, clearCsv } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Solo se aceptan archivos .csv');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const text = await file.text();
        const rows = parseCSV(text).map(normalizeRow);
        if (rows.length === 0) {
          setError('El archivo está vacío o no se pudieron parsear filas.');
          return;
        }
        setCsv(rows, file.name);
      } catch (e) {
        setError('Error al procesar el archivo. Verificá el formato.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [setCsv]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const hasData = state.csvData.length > 0;

  // Cantidad de HUs únicos en el dataset
  const uniqueHus = hasData
    ? new Set(state.csvData.map((r) => r.outboundId)).size
    : 0;

  return (
    <div className="space-y-4">
      {hasData ? (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 className="text-emerald-500 shrink-0" size={22} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-800 text-sm truncate">
              {state.csvFileName}
            </p>
            <p className="text-emerald-600 text-xs mt-0.5">
              {state.csvData.length.toLocaleString()} shipments cargados ·{' '}
              {uniqueHus.toLocaleString()} HUs únicos
            </p>
          </div>
          <button
            onClick={clearCsv}
            className="text-emerald-400 hover:text-emerald-700 transition-colors"
            title="Eliminar dataset"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
          }`}
        >
          <div className="bg-white rounded-full p-3 shadow-sm">
            {loading ? (
              <div className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={28} className="text-zinc-400" />
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-700 text-sm">
              {loading ? 'Procesando...' : 'Arrastrá el CSV o hacé clic'}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              Archivo .csv delimitado por comas exportado del sistema
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <X size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {hasData && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoBox
            label="Total shipments"
            value={state.csvData.length.toLocaleString()}
          />
          <InfoBox label="HUs únicos" value={uniqueHus.toLocaleString()} />
          <InfoBox
            label="Sub-CAs"
            value={
              new Set(state.csvData.map((r) => r.labelingZone).filter(Boolean))
                .size
            }
          />
          <InfoBox
            label="Archivo"
            value={state.csvFileName}
            truncate
          />
        </div>
      )}
    </div>
  );
}

function InfoBox({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string | number;
  truncate?: boolean;
}) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
      <p className="text-zinc-400 text-xs">{label}</p>
      <p
        className={`font-semibold text-zinc-800 mt-0.5 text-sm ${
          truncate ? 'truncate' : ''
        }`}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}
