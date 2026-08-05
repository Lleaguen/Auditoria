'use client';

import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { SITES, SiteKey, getStoredSite, saveSite } from '@/lib/siteConfig';

interface Props {
  /** Callback opcional — si se pasa, se llama al elegir en vez de hacer reload */
  onSelect?: () => void;
}

export default function SiteSelectorModal({ onSelect }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getStoredSite()) setOpen(true);
  }, []);

  const handleSelect = (key: SiteKey) => {
    saveSite(key);
    if (onSelect) {
      // Llamado desde AppShell antes del login — no recargamos, solo actualizamos estado
      setOpen(false);
      onSelect();
    } else {
      // Llamado desde el sidebar (cambio de planta en medio de sesión) → recargar
      setOpen(false);
      window.location.reload();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-zinc-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
            <Building2 size={26} className="text-zinc-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-800">¿A qué planta te conectás?</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Elegí la planta para la que querés registrar auditorías.
          </p>
        </div>

        {/* Opciones */}
        <div className="space-y-3">
          {SITES.map((site) => (
            <button
              key={site.key}
              onClick={() => handleSelect(site.key)}
              className={`
                w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left
                transition-all hover:scale-[1.01] active:scale-[0.99]
                ${site.color === 'indigo'
                  ? 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
                  : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'}
              `}
            >
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0
                ${site.color === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-600'}
              `}>
                {site.key}
              </div>
              <div>
                <p className="font-semibold text-zinc-800">{site.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono truncate">{site.apiUrl}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-center text-zinc-300 mt-6">
          Podés cambiar de planta en cualquier momento desde el menú lateral.
        </p>
      </div>
    </div>
  );
}
