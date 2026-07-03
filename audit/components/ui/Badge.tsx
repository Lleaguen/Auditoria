'use client';

import React from 'react';

type BadgeVariant = 'ok' | 'missing' | 'surplus' | 'crossed' | 'neutral' | 'dispatched';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  ok:         'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100',
  missing:    'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
  surplus:    'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100',
  crossed:    'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100',
  neutral:    'bg-zinc-100 text-zinc-600 border-zinc-200',
  dispatched: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-100',
};

const VARIANT_LABELS: Record<BadgeVariant, string> = {
  ok:         '✓ OK',
  missing:    '✕ Faltante',
  surplus:    '+ Sobrante',
  crossed:    '⇄ Cruzado',
  neutral:    '',
  dispatched: '↗ Despachado',
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export default function Badge({ variant, label, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${VARIANT_STYLES[variant]} ${className}`}
    >
      {label ?? VARIANT_LABELS[variant]}
    </span>
  );
}
