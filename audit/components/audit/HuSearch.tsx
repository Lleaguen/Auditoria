'use client';

import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getShipmentsForHu } from '@/lib/audit-engine';
import { normalizeShipmentId } from '@/lib/csv-parser';

interface HuSearchProps {
  onHuSelected: (huId: string) => void;
  currentHu: string;
}

export default function HuSearch({ onHuSelected, currentHu }: HuSearchProps) {
  const { state } = useAppStore();
  const [input, setInput] = useState(currentHu);
  const [preview, setPreview] = useState<number | null>(null);

  const handleSearch = useCallback(() => {
    const trimmed = normalizeShipmentId(input.trim());
    if (!trimmed) return;
    const rows = getShipmentsForHu(state.csvData, trimmed);
    setPreview(rows.length);
    if (rows.length > 0) {
      onHuSelected(trimmed);
    }
  }, [input, state.csvData, onHuSelected]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
        Número de HU a auditar
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setPreview(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ingresá el Outbound ID del HU..."
          className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          disabled={state.csvData.length === 0}
        />
        <button
          onClick={handleSearch}
          disabled={state.csvData.length === 0 || !input.trim()}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Search size={15} />
          Buscar
        </button>
      </div>

      {state.csvData.length === 0 && (
        <p className="text-amber-600 text-xs">
          ⚠ Primero cargá el CSV en la página de inicio.
        </p>
      )}

      {preview !== null && preview === 0 && (
        <p className="text-red-600 text-xs">
          No se encontró el HU <strong>{input.trim()}</strong> en el dataset cargado.
        </p>
      )}

      {preview !== null && preview > 0 && (
        <p className="text-emerald-600 text-xs">
          ✓ {preview} shipments encontrados en sistema para el HU{' '}
          <strong>{input.trim()}</strong>
        </p>
      )}
    </div>
  );
}
