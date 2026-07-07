'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchUsers, createUser, deleteUser } from '@/lib/api';
import type { AuthUser, UserRole } from '@/lib/auth';
import {
  UserPlus, Trash2, RefreshCw, Shield, User,
  X, Eye, EyeOff, Check, AlertCircle,
} from 'lucide-react';

const ROLE_STYLES: Record<UserRole, string> = {
  admin:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  auditor: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export default function UsersPanel() {
  const [users, setUsers]       = useState<AuthUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (user: AuthUser) => {
    if (!confirm(`¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleCreated = (user: AuthUser) => {
    setUsers((prev) => [...prev, user]);
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-700">{users.length}</span> usuarios registrados
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:bg-zinc-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm"
          >
            <UserPlus size={14} />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 gap-3">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Cargando usuarios...</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300">
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold">Username</th>
                <th className="px-4 py-3 text-left font-semibold">Rol</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Creado</th>
                <th className="px-4 py-3 text-center font-semibold"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {u.nombre[0]}{u.apellido[0]}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-800 text-sm">{u.nombre} {u.apellido}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600 text-sm">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${ROLE_STYLES[u.role]}`}>
                      {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.active ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-zinc-200 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 text-sm">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear usuario */}
      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// ── Modal crear usuario ───────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: AuthUser) => void;
}) {
  const [form, setForm] = useState({
    nombre:   '',
    apellido: '',
    username: '',
    password: '',
    role:     'auditor' as UserRole,
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await createUser(form);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-indigo-500" />
            <h2 className="font-bold text-zinc-800">Nuevo usuario</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                type="text"
                value={form.nombre}
                onChange={handleChange('nombre')}
                placeholder="Juan"
                required
                className="input-base"
              />
            </Field>
            <Field label="Apellido">
              <input
                type="text"
                value={form.apellido}
                onChange={handleChange('apellido')}
                placeholder="Pérez"
                required
                className="input-base"
              />
            </Field>
          </div>

          <Field label="Username">
            <input
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              placeholder="juan.perez"
              required
              autoComplete="off"
              className="input-base font-mono"
            />
          </Field>

          <Field label="Contraseña">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <Field label="Rol">
            <select
              value={form.role}
              onChange={handleChange('role')}
              className="input-base"
            >
              <option value="auditor">Auditor</option>
              <option value="admin">Admin</option>
            </select>
          </Field>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
