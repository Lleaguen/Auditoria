'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ScanLine, X, Trash2, Hash } from 'lucide-react';
import { normalizeShipmentId } from '@/lib/csv-parser';

interface ScannerInputProps {
  scannedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export default function ScannerInput({
  scannedIds,
  onAdd,
  onRemove,
  onClear,
  disabled = false,
}: ScannerInputProps) {
  const [input, setInput] = useState('');
  const [lastAdded, setLastAdded] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = normalizeShipmentId(value.trim());
      if (!trimmed) return;
      if (scannedIds.includes(trimmed)) {
        setLastAdded(trimmed);
        setDuplicate(true);
        setInput('');
        return;
      }
      onAdd(trimmed);
      setLastAdded(trimmed);
      setDuplicate(false);
      setInput('');
    },
    [scannedIds, onAdd]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSubmit(input);
    },
    [input, handleSubmit]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          <ScanLine size={12} />
          Scanner / Ingreso manual
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            <span className="font-bold text-zinc-700">{scannedIds.length}</span> bipeados
          </span>
          {scannedIds.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-zinc-300 hover:text-red-400 hover:bg-red-50 px-2 py-1 rounded-lg"
            >
              <Trash2 size={11} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escanear o tipear Shipment ID..."
            disabled={disabled}
            className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent focus:bg-white disabled:opacity-50 placeholder:font-sans placeholder:text-zinc-400"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <button
          onClick={() => handleSubmit(input)}
          disabled={disabled || !input.trim()}
          className="bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* Feedback último scan */}
      {lastAdded && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          duplicate
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {duplicate ? '⚠ Ya bipeado:' : '✓ Agregado:'}
          <span className="font-mono font-semibold">{lastAdded}</span>
        </div>
      )}

      {/* Lista de bipeados */}
      {scannedIds.length > 0 && (
        <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50 divide-y divide-zinc-100">
          {[...scannedIds].reverse().map((id, i) => (
            <div
              key={id}
              className="flex items-center justify-between px-3.5 py-2 hover:bg-white group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] text-zinc-300 font-mono w-4 text-right shrink-0">
                  {scannedIds.length - i}
                </span>
                <span className="font-mono text-xs text-zinc-700">{id}</span>
              </div>
              <button
                onClick={() => onRemove(id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-400 p-1 rounded"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {scannedIds.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-zinc-300">
          <Hash size={20} />
          <p className="text-xs">Ningún shipment bipeado todavía</p>
        </div>
      )}
    </div>
  );
}
