'use client';

import React, { useState, useCallback } from 'react';
import { Save, RotateCcw, CalendarDays, Clock, PlayCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { runAudit } from '@/lib/audit-engine';
import type { AuditResult, Shift } from '@/lib/types';
import HuSearch from './HuSearch';
import ScannerInput from './ScannerInput';
import AuditTable from './AuditTable';

const SHIFT_OPTIONS: { value: Shift; label: string; color: string }[] = [
  { value: 'TT', label: 'TT — Tarde',   color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'TN', label: 'TN — Noche',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'TM', label: 'TM — Mañana',  color: 'bg-sky-50 text-sky-700 border-sky-200' },
];

export default function AuditPanel() {
  const { addAudit } = useAppStore();
  const { state } = useAppStore();

  const [huId, setHuId] = useState('');
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toLocaleDateString('es-AR'));
  const [shift, setShift] = useState<Shift>('TT');
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleHuSelected = useCallback((id: string) => {
    setHuId(id);
    setScannedIds([]);
    setAudit(null);
    setSaved(false);
  }, []);

  const handleAddScan    = useCallback((id: string) => { setScannedIds((p) => [...p, id]); setSaved(false); }, []);
  const handleRemoveScan = useCallback((id: string) => { setScannedIds((p) => p.filter((s) => s !== id)); setSaved(false); }, []);
  const handleClearScans = useCallback(() => { setScannedIds([]); setSaved(false); }, []);

  const handleRunAudit = useCallback(() => {
    if (!huId || state.csvData.length === 0) return;
    const result = runAudit(state.csvData, huId, scannedIds, date, shift);
    setAudit(result);
    setSaved(false);
    setSaveError(null);
  }, [huId, scannedIds, date, shift, state.csvData]);

  const handleSave = useCallback(async () => {
    if (!audit) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addAudit(audit);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [audit, addAudit]);

  const handleReset = useCallback(() => {
    setHuId('');
    setScannedIds([]);
    setAudit(null);
    setSaved(false);
    setSaveError(null);
  }, []);

  return (
    <div className="space-y-5">
      {/* Metadatos — card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
          Datos de la auditoría
        </p>
        <div className="grid grid-cols-2 gap-4">
          {/* Fecha */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
              <CalendarDays size={12} />
              Fecha
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent focus:bg-white"
            />
          </div>
          {/* Turno */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
              <Clock size={12} />
              Turno
            </label>
            <div className="flex gap-2">
              {SHIFT_OPTIONS.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setShift(value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    shift === value
                      ? `${color} shadow-sm`
                      : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda de HU */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
        <HuSearch onHuSelected={handleHuSelected} currentHu={huId} />
      </div>

      {/* Scanner */}
      {huId && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm">
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
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
          >
            <PlayCircle size={16} />
            Comparar con sistema
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
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
            <div>
              <h2 className="font-bold text-zinc-800 text-lg tracking-tight">
                HU {audit.huId}
              </h2>
              <p className="text-zinc-400 text-xs mt-0.5">
                {audit.date} · Turno {audit.shift} · Sub-CA {audit.subca}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saved || saving}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${
                saved
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : saving
                  ? 'bg-zinc-100 text-zinc-400 cursor-wait'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              }`}
            >
              <Save size={14} />
              {saved ? 'Guardado ✓' : saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {saveError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              ⚠ {saveError} — verificá que el backend esté corriendo.
            </div>
          )}

          <AuditTable audit={audit} />
        </div>
      )}
    </div>
  );
}
