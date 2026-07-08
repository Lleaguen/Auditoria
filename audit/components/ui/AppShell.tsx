'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const redirected = useRef(false);

  // usePathname() puede devolver /login o /Auditoria/login según el entorno.
  // Normalizamos para comparar solo el segmento final.
  const cleanPath   = pathname.replace(/^\/Auditoria/, '') || '/';
  const isLoginPage = cleanPath === '/login';
  const isAdminPage = cleanPath.startsWith('/usuarios') || cleanPath.startsWith('/rendimiento');

  useEffect(() => {
    if (loading) return;

    if (!user && !isLoginPage && !redirected.current) {
      redirected.current = true;
      router.replace('/login');
      return;
    }

    if (user && isLoginPage && !redirected.current) {
      redirected.current = true;
      router.replace('/');
      return;
    }

    // Redirigir auditores que intenten acceder a páginas de admin
    if (user && user.role !== 'admin' && isAdminPage && !redirected.current) {
      redirected.current = true;
      router.replace('/');
    }
  }, [user, loading, isLoginPage, isAdminPage, router]);

  // Resetear el flag cuando cambia el pathname
  useEffect(() => {
    redirected.current = false;
  }, [pathname]);

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
