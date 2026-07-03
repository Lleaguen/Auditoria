'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export default function StatCard({
  label,
  value,
  sub,
  colorClass = 'text-zinc-900',
  icon,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {label}
        </span>
        {icon && (
          <span className="bg-zinc-100 text-zinc-400 p-1.5 rounded-lg">
            {icon}
          </span>
        )}
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${colorClass}`}>
          {value}
        </div>
        {sub && (
          <div className="text-xs text-zinc-400 mt-1 font-medium">{sub}</div>
        )}
      </div>
    </div>
  );
}
