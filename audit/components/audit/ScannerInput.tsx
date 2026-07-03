'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Scan, X, Trash2 } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Mantiene foco en el input para el scanner
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = normalizeShipmentId(value.trim());
      if (!trimmed) return;
      if (scannedIds.includes(trimmed)) {
        setLastAdded(`⚠ Ya bipeado: ${trimmed}`);
        setInput('');
        return;
      }
      onAdd(trimmed);
      setLastAdded(`✓ ${trimmed}`);
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
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
          <Scan size={13} />
          Scanner / Ingreso manual
        </label>
        {scannedIds.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
            Limpiar todo
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escanear o tipear Shipment ID..."
          disabled={disabled}
          className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:bg-zinc-50 disabled:text-zinc-400"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          onClick={() => handleSubmit(input)}
          disabled={disabled || !input.trim()}
          className="bg-zinc-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>

      {lastAdded && (
        <p
          className={`text-xs font-mono ${
            lastAdded.startsWith('⚠') ? 'text-amber-600' : 'text-emerald-600'
          }`}
        >
          {lastAdded}
        </p>
      )}

      <div className="text-xs text-zinc-500">
        {scannedIds.length} shipment{scannedIds.length !== 1 ? 's' : ''} bipeados
      </div>

      {/* Lista de bipeados */}
      {scannedIds.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100">
          {[...scannedIds].reverse().map((id) => (
            <div
              key={id}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-zinc-50 group"
            >
              <span className="font-mono text-xs text-zinc-700">{id}</span>
              <button
                onClick={() => onRemove(id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
