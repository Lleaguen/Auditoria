'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardCheck, Upload } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Cargar CSV', icon: Upload },
  { href: '/auditoria', label: 'Auditoría HU', icon: ClipboardCheck },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-zinc-900 text-white border-b border-zinc-700">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-bold text-sm mr-6 text-zinc-300 tracking-wide">
          🏭 HU Audit
        </span>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
