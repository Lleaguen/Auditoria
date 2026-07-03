'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardCheck, Upload, Warehouse } from 'lucide-react';
import BackendStatus from './BackendStatus';

const NAV_ITEMS = [
  { href: '/',          label: 'Cargar CSV',   icon: Upload,         desc: 'Dataset del sistema' },
  { href: '/auditoria', label: 'Auditoría HU', icon: ClipboardCheck, desc: 'Escanear y comparar' },
  { href: '/dashboard', label: 'Dashboard',    icon: BarChart3,      desc: 'Métricas y reportes' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] shrink-0 min-h-screen bg-zinc-950 flex flex-col border-r border-zinc-800/60">
      {/* Logo */}
      <div className="px-5 py-7 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-500 rounded-lg p-1.5">
            <Warehouse size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">HU Audit</p>
            <p className="text-zinc-500 text-[10px] leading-tight">Auditoría de pallets</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 space-y-1">
        <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-3">
          Módulos
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, desc }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group relative ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full" />
              )}
              <Icon
                size={16}
                className={active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}
              />
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-tight ${active ? 'text-indigo-200' : ''}`}>
                  {label}
                </p>
                <p className="text-[10px] text-zinc-600 leading-tight mt-0.5">{desc}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer — estado del backend */}
      <div className="px-5 py-5 border-t border-zinc-800/60">
        <BackendStatus />
      </div>
    </aside>
  );
}
