'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, ClipboardCheck, Upload, Warehouse, Users, LogOut, Shield, User } from 'lucide-react';
import BackendStatus from './BackendStatus';
import { useAuth } from '@/lib/authContext';

const NAV_ITEMS = [
  { href: '/',          label: 'Cargar CSV',   icon: Upload,         desc: 'Dataset del sistema' },
  { href: '/auditoria', label: 'Auditoría HU', icon: ClipboardCheck, desc: 'Escanear y comparar' },
  { href: '/dashboard', label: 'Dashboard',    icon: BarChart3,      desc: 'Métricas y reportes' },
];

const ADMIN_ITEMS = [
  { href: '/usuarios',    label: 'Usuarios',     icon: Users,    desc: 'Gestión de accesos' },
  { href: '/rendimiento', label: 'Rendimiento',  icon: BarChart3, desc: 'Desempeño de auditores' },
];

export default function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const { user, signOut, isAdmin } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  const NavLink = ({ href, label, icon: Icon, desc }: typeof NAV_ITEMS[0]) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group relative ${
          active ? 'bg-indigo-500/15' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full" />
        )}
        <Icon size={16} className={active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
        <div className="min-w-0">
          <p className={`text-sm font-medium leading-tight ${active ? 'text-indigo-200' : ''}`}>{label}</p>
          <p className="text-[10px] text-zinc-600 leading-tight mt-0.5">{desc}</p>
        </div>
      </Link>
    );
  };

  return (
    <aside className="w-[240px] shrink-0 min-h-screen bg-zinc-950 flex flex-col border-r border-zinc-800/60">

      {/* Logo */}
      <div className="px-5 py-6 border-b border-zinc-800/60">
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

      {/* Nav principal */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-3">
          Módulos
        </p>
        {NAV_ITEMS.map((item) => <NavLink key={item.href} {...item} />)}

        {/* Sección admin */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-2">
                Administración
              </p>
            </div>
            {ADMIN_ITEMS.map((item) => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Footer: usuario + backend status + logout */}
      <div className="px-4 py-4 border-t border-zinc-800/60 space-y-3">
        {/* Backend status */}
        <BackendStatus />

        {/* Usuario logueado */}
        {user && (
          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
              {user.role === 'admin'
                ? <Shield size={12} className="text-indigo-400" />
                : <User size={12} className="text-zinc-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-300 text-xs font-medium truncate leading-tight">
                {user.nombre} {user.apellido}
              </p>
              <p className="text-zinc-600 text-[10px] leading-tight capitalize">{user.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
