'use client';

import React, { useState, useCallback } from 'react';
import {
  Save,
  RotateCcw,
  CalendarDays,
  Clock,
  PlayCircle,
  MessageSquare,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { runAudit } from '@/lib/audit-engine';
import type { AuditResult, Shift } from '@/lib/types';
import HuSearch from './HuSearch';
import ScannerInput from './ScannerInput';
import AuditTable from './AuditTable';

const SHIFT_OPTIONS: { value: Shift; label: string; color: string }[] = [
  { value: 'TT', label: 'TT', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'TN', label: 'TN', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'TM', label: 'TM', color: 'bg-sky-50 text-sky-700 border-sky-200' },
];

// Pasos del flujo de auditoría
type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: 'Datos' },
  { id: 2, label: 'HU + Scanner' },
  { id: 3, label: 'Observaciones' },
  { id: 4, label: 'Resultado' },
] as const;

export default function AuditPanel() {
  const { addAudit, state } = useAppStore();

  const [step, setStep]               = useState<Step>(1);
  const [huId, setHuId]               = useState('');
  const [scannedIds, setScannedIds]   = useState<string[]>([]);
  const [date, setDate]               = useState(() => new Date().toLocaleDateString('es-AR'));
  const [shift, setShift]             = useState<Shift>('TT');
  const [observations, setObservations] = useState('');
  const [audit, setAudit]             = useState<AuditResult | null>(null);
  const [saved, setSaved]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────

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
    const result = runAudit(state.csvData, huId, scannedIds, date, shift, observations);
    setAudit(result);
    setSaved(false);
    setSaveError(null);
    setStep(4);
  }, [huId, scannedIds, date, shift, observations, state.csvData]);

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
    setObservations('');
    setSaved(false);
    setSaveError(null);
    setStep(1);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Stepper */}
      <StepBar current={step} onStep={setStep} auditReady={!!audit} />

      {/* ── Paso 1: Datos de la auditoría ─────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Datos de la auditoría
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
                <CalendarDays size={12} /> Fecha
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
                <Clock size={12} /> Turno
              </label>
              <div className="flex gap-2">
                {SHIFT_OPTIONS.map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => setShift(value)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      shift === value ? `${color} shadow-sm` : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setStep(2)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 2: HU + Scanner ──────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <HuSearch onHuSelected={handleHuSelected} currentHu={huId} />
          </div>

          {huId && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <ScannerInput
                scannedIds={scannedIds}
                onAdd={handleAddScan}
                onRemove={handleRemoveScan}
                onClear={handleClearScans}
                disabled={!huId}
              />
            </div>
          )}

          <div className="flex gap-3 justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50"
            >
              ← Atrás
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!huId}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 3: Observaciones ─────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-zinc-400" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Observaciones del auditor
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-2">
              Anotá cualquier novedad del pallet antes de comparar con el sistema.
              Este campo quedará guardado junto con la auditoría.
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={6}
              placeholder="Ej: Pallet con precinto roto · Bultos mojados · Shipment X sin etiqueta · Cruce detectado manualmente..."
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white resize-none leading-relaxed"
            />
            <p className="text-right text-xs text-zinc-400 mt-1">
              {observations.length} caracteres
            </p>
          </div>

          {/* Resumen rápido antes de comparar */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-500 space-y-1">
            <div className="flex justify-between">
              <span>HU a auditar</span>
              <span className="font-mono font-semibold text-zinc-800">{huId}</span>
            </div>
            <div className="flex justify-between">
              <span>Fecha / Turno</span>
              <span className="font-semibold text-zinc-700">{date} · {shift}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipments bipeados</span>
              <span className="font-semibold text-zinc-700">{scannedIds.length}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50"
            >
              ← Atrás
            </button>
            <button
              onClick={handleRunAudit}
              disabled={state.csvData.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
            >
              <PlayCircle size={16} />
              Comparar con sistema
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 4: Resultado ─────────────────────────────────────── */}
      {step === 4 && audit && (
        <div className="space-y-4">
          {/* Header del resultado */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-zinc-800 text-lg tracking-tight">
                  HU {audit.huId}
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {audit.date} · Turno {audit.shift} · Sub-CA {audit.subca}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:bg-zinc-50"
                >
                  <RotateCcw size={13} /> Nueva
                </button>
                <button
                  onClick={handleSave}
                  disabled={saved || saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all ${
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
            </div>

            {/* Observaciones (si hay) */}
            {audit.observations && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold block mb-1 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Observaciones del auditor
                </span>
                <p className="whitespace-pre-wrap">{audit.observations}</p>
              </div>
            )}

            {saveError && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                ⚠ {saveError}
              </div>
            )}
          </div>

          <AuditTable audit={audit} />
        </div>
      )}

    </div>
  );
}

// ── StepBar ───────────────────────────────────────────────────────────────────

function StepBar({
  current,
  onStep,
  auditReady,
}: {
  current: Step;
  onStep: (s: Step) => void;
  auditReady: boolean;
}) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, idx) => {
        const isActive   = s.id === current;
        const isComplete = s.id < current || (s.id === 4 && auditReady);
        const canClick   = s.id < current || (s.id === 4 && auditReady);

        return (
          <React.Fragment key={s.id}>
            <button
              onClick={() => canClick && onStep(s.id as Step)}
              disabled={!canClick && !isActive}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isComplete
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-zinc-50 text-zinc-400 border border-zinc-200 cursor-default'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive ? 'bg-white/20' : isComplete ? 'bg-emerald-200' : 'bg-zinc-200'
              }`}>
                {isComplete && !isActive ? '✓' : s.id}
              </span>
              {s.label}
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-4 ${s.id < current ? 'bg-emerald-300' : 'bg-zinc-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
