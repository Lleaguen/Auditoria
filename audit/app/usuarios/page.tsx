'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import UsersPanel from '@/components/users/UsersPanel';
import { Users, ShieldAlert } from 'lucide-react';

export default function UsuariosPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace('/');
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !user) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
        <ShieldAlert size={32} className="text-zinc-300" />
        <p className="font-semibold text-zinc-600">Acceso denegado</p>
        <p className="text-sm">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold mb-2">
          <Users size={14} />
          Administración
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Gestión de usuarios
        </h1>
        <p className="text-zinc-500 mt-2 text-sm">
          Creá, visualizá y eliminá usuarios del sistema.
        </p>
      </div>
      <UsersPanel />
    </div>
  );
}
