'use client';

import React from 'react';

type BadgeVariant = 'ok' | 'missing' | 'surplus' | 'crossed' | 'neutral' | 'dispatched';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  missing: 'bg-red-100 text-red-800 border-red-200',
  surplus: 'bg-orange-100 text-orange-800 border-orange-200',
  crossed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  dispatched: 'bg-blue-100 text-blue-800 border-blue-200',
};

const VARIANT_LABELS: Record<BadgeVariant, string> = {
  ok: 'OK',
  missing: 'FALTANTE',
  surplus: 'SOBRANTE',
  crossed: 'CRUZADO',
  neutral: '',
  dispatched: 'DESPACHADO',
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export default function Badge({ variant, label, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${VARIANT_STYLES[variant]} ${className}`}
    >
      {label ?? VARIANT_LABELS[variant]}
    </span>
  );
}
