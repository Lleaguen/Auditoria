'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  const isLoginPage = pathname === '/login' || pathname.endsWith('/login');

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      window.location.replace('/Auditoria/login');
    }
    if (user && isLoginPage) {
      window.location.replace('/Auditoria/');
    }
  }, [user, loading, isLoginPage, router]);

  // Mientras resuelve la sesión
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Página de login — sin sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Sin sesión — no renderiza nada (el useEffect redirige)
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-8 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
