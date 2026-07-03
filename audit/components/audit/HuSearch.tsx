'use client';

import React, { useState, useCallback } from 'react';
import { Search, PackageSearch } from 'lucide-react';
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
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(() => {
    const trimmed = normalizeShipmentId(input.trim());
    if (!trimmed) return;
    const rows = getShipmentsForHu(state.csvData, trimmed);
    setPreview(rows.length);
    setSearched(true);
    if (rows.length > 0) onHuSelected(trimmed);
  }, [input, state.csvData, onHuSelected]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        <PackageSearch size={12} />
        Número de HU
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setSearched(false); setPreview(null); }}
          onKeyDown={handleKeyDown}
          placeholder="Outbound ID del HU..."
          className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent focus:bg-white font-mono placeholder:font-sans placeholder:text-zinc-400 disabled:opacity-50"
          disabled={state.csvData.length === 0}
        />
        <button
          onClick={handleSearch}
          disabled={state.csvData.length === 0 || !input.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
        >
          <Search size={14} />
          Buscar
        </button>
      </div>

      {/* Feedback */}
      {state.csvData.length === 0 && (
        <p className="text-amber-600 text-xs flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ Primero cargá el CSV en la página de inicio.
        </p>
      )}
      {searched && preview === 0 && (
        <p className="text-red-600 text-xs flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          No se encontró el HU <strong className="font-mono">{input.trim()}</strong> en el dataset.
        </p>
      )}
      {searched && preview !== null && preview > 0 && (
        <p className="text-emerald-700 text-xs flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          ✓ <strong>{preview}</strong> shipments encontrados en sistema para este HU.
        </p>
      )}
    </div>
  );
}
