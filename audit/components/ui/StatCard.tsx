'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
  icon?: React.ReactNode;
}

export default function StatCard({
  label,
  value,
  sub,
  colorClass = 'text-zinc-900',
  icon,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wide">
        {icon && <span className="text-zinc-400">{icon}</span>}
        {label}
      </div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}
