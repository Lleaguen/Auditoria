'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, CheckCircle2, FileSpreadsheet, Database, Tag, Layers } from 'lucide-react';
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
  const uniqueHus = hasData ? new Set(state.csvData.map((r) => r.outboundId)).size : 0;
  const uniqueSubcas = hasData
    ? new Set(state.csvData.map((r) => r.labelingZone).filter(Boolean)).size
    : 0;

  return (
    <div className="space-y-4">
      {hasData ? (
        <>
          {/* Dataset cargado */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 rounded-xl p-2.5 shrink-0">
                <FileSpreadsheet size={20} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <p className="font-semibold text-zinc-800 text-sm truncate">
                    {state.csvFileName}
                  </p>
                </div>
                <p className="text-zinc-400 text-xs mt-1">
                  Dataset cargado en memoria — listo para auditar
                </p>
              </div>
              <button
                onClick={clearCsv}
                className="text-zinc-300 hover:text-red-400 p-1 rounded-lg hover:bg-red-50"
                title="Eliminar dataset"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stats del dataset */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-100">
              <DataStat
                icon={<Database size={13} />}
                label="Shipments"
                value={state.csvData.length.toLocaleString()}
              />
              <DataStat
                icon={<Layers size={13} />}
                label="HUs únicos"
                value={uniqueHus.toLocaleString()}
              />
              <DataStat
                icon={<Tag size={13} />}
                label="Sub-CAs"
                value={uniqueSubcas}
              />
            </div>
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            className="w-full text-sm text-zinc-400 hover:text-zinc-600 border border-dashed border-zinc-300 rounded-xl py-2.5 hover:border-zinc-400 hover:bg-zinc-50"
          >
            Reemplazar archivo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="hidden"
          />
        </>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer group ${
            dragging
              ? 'border-indigo-400 bg-indigo-50/60'
              : 'border-zinc-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
        >
          <div className={`rounded-2xl p-4 ${dragging ? 'bg-indigo-100' : 'bg-zinc-100 group-hover:bg-indigo-100'}`}>
            {loading ? (
              <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={28} className={dragging ? 'text-indigo-500' : 'text-zinc-400 group-hover:text-indigo-500'} />
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-700 text-sm">
              {loading ? 'Procesando archivo...' : 'Arrastrá el CSV aquí'}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              o hacé clic para seleccionar — archivo .csv delimitado por comas
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
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-700 text-sm">
          <X size={15} className="shrink-0 text-red-400" />
          {error}
        </div>
      )}
    </div>
  );
}

function DataStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium">
        {icon}
        {label}
      </div>
      <p className="text-zinc-800 font-bold text-lg leading-tight">{value}</p>
    </div>
  );
}
