'use client';

import React, { useState, useCallback } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { runAudit } from '@/lib/audit-engine';
import type { AuditResult, Shift } from '@/lib/types';
import HuSearch from './HuSearch';
import ScannerInput from './ScannerInput';
import AuditTable from './AuditTable';

export default function AuditPanel() {
  const { addAudit } = useAppStore();
  const { state } = useAppStore();

  const [huId, setHuId] = useState('');
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toLocaleDateString('es-AR'));
  const [shift, setShift] = useState<Shift>('TT');
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [saved, setSaved] = useState(false);

  const handleHuSelected = useCallback(
    (id: string) => {
      setHuId(id);
      setScannedIds([]);
      setAudit(null);
      setSaved(false);
    },
    []
  );

  const handleAddScan = useCallback((id: string) => {
    setScannedIds((prev) => [...prev, id]);
    setSaved(false);
  }, []);

  const handleRemoveScan = useCallback((id: string) => {
    setScannedIds((prev) => prev.filter((s) => s !== id));
    setSaved(false);
  }, []);

  const handleClearScans = useCallback(() => {
    setScannedIds([]);
    setSaved(false);
  }, []);

  const handleRunAudit = useCallback(() => {
    if (!huId || state.csvData.length === 0) return;
    const result = runAudit(state.csvData, huId, scannedIds, date, shift);
    setAudit(result);
    setSaved(false);
  }, [huId, scannedIds, date, shift, state.csvData]);

  const handleSave = useCallback(() => {
    if (!audit) return;
    addAudit(audit);
    setSaved(true);
  }, [audit, addAudit]);

  const handleReset = useCallback(() => {
    setHuId('');
    setScannedIds([]);
    setAudit(null);
    setSaved(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Metadatos de la auditoría */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1">
            Fecha
          </label>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1">
            Turno
          </label>
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value as Shift)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="TT">TT</option>
            <option value="TN">TN</option>
            <option value="AM">AM</option>
          </select>
        </div>
      </div>

      {/* Búsqueda de HU */}
      <HuSearch onHuSelected={handleHuSelected} currentHu={huId} />

      {/* Scanner */}
      {huId && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <ScannerInput
            scannedIds={scannedIds}
            onAdd={handleAddScan}
            onRemove={handleRemoveScan}
            onClear={handleClearScans}
            disabled={!huId}
          />
        </div>
      )}

      {/* Acciones */}
      {huId && (
        <div className="flex gap-3">
          <button
            onClick={handleRunAudit}
            disabled={state.csvData.length === 0}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Comparar con sistema
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      )}

      {/* Resultado */}
      {audit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-800 text-base">
              Resultado — HU {audit.huId}
            </h2>
            <button
              onClick={handleSave}
              disabled={saved}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              <Save size={14} />
              {saved ? 'Guardado ✓' : 'Guardar auditoría'}
            </button>
          </div>

          <AuditTable audit={audit} />
        </div>
      )}
    </div>
  );
}
