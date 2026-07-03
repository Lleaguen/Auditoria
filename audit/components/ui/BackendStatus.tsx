'use client';

import { useAppStore } from '@/lib/store';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function BackendStatus() {
  const { state, reloadAudits } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await reloadAudits();
    setRefreshing(false);
  };

  if (state.loadingAudits) {
    return (
      <div className="flex items-center gap-2">
        <RefreshCw size={11} className="animate-spin text-zinc-500" />
        <span className="text-[11px] text-zinc-500">Conectando...</span>
      </div>
    );
  }

  if (!state.backendOnline) {
    return (
      <button
        onClick={handleRefresh}
        title="Backend offline — click para reintentar"
        className="flex items-center gap-2 w-full group"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        <span className="text-[11px] text-red-400 group-hover:text-red-300">
          Backend offline
        </span>
        <RefreshCw
          size={10}
          className={`ml-auto text-zinc-600 group-hover:text-zinc-400 ${refreshing ? 'animate-spin' : ''}`}
        />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_4px_1px_rgba(52,211,153,0.5)]" />
      <span className="text-[11px] text-zinc-500">Backend online</span>
      <Wifi size={10} className="ml-auto text-zinc-700" />
    </div>
  );
}
