'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchPlans, savePlan, deletePlan, fetchAudits,
  type AuditPlan, type PlanItem,
} from '@/lib/api';
import type { AuditResult } from '@/lib/types';
import { useAuth } from '@/lib/authContext';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Plus, Trash2, Save, RefreshCw, AlertCircle,
  ClipboardList, Target, TrendingUp, Download,
} from 'lucide-react';

type Shift = 'TT' | 'TN' | 'TM' | '';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function pct(real: number, plan: number): number {
  if (plan === 0) return real > 0 ? 100 : 0;
  return Math.round((real / plan) * 1000) / 10;
}

export default function PlanPanel() {
  const { isAdmin } = useAuth();

  const [date, setDate]     = useState(today());
  const [shift, setShift]   = useState<Shift>('');
  const [plan, setPlan]     = useState<AuditPlan | null>(null);
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [editItems, setEditItems] = useState<Omit<PlanItem, 'assignedAuditor'>[]>([]);
  const [editing, setEditing]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Si shift está vacío, no lo mandamos como filtro para traer todos
      const filters: { date: string; shift?: string } = { date };
      if (shift) filters.shift = shift;

      const [plans, auditData] = await Promise.all([
        fetchPlans(date, shift || undefined),
        fetchAudits(filters),
      ]);
      // Buscar plan que coincida con date y shift ('' si no hay turno seleccionado)
      const found = plans.find((p) => p.date === date && p.shift === shift);
      setPlan(found ?? null);
      setAudits(auditData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [date, shift]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    const items = plan
      ? plan.items.map(({ subca, targetHus }) => ({ subca, targetHus }))
      : [{ subca: '', targetHus: 1 }];
    setEditItems(items);
    setEditing(true);
  };

  const addRow    = () => setEditItems((p) => [...p, { subca: '', targetHus: 1 }]);
  const removeRow = (i: number) => setEditItems((p) => p.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: 'subca' | 'targetHus', value: string | number) =>
    setEditItems((p) => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSave = async () => {
    const validItems = editItems
      .filter((it) => it.subca.trim() !== '')
      .map((it) => ({ ...it, assignedAuditor: '' })); // assignedAuditor se elimina del formulario
    if (validItems.length === 0) {
      setError('Agregá al menos un sub-CA con nombre');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await savePlan({ date, shift, items: validItems });
      setPlan(saved);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!plan?.id) return;
    if (!confirm('¿Eliminar este plan?')) return;
    try {
      await deletePlan(plan.id);
      setPlan(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  // ── Análisis plan vs real ────────────────────────────────────────────────

  const analysis = useMemo(() => {
    if (!plan) return [];

    // Agrupar auditorías reales por subca, registrando quién auditó (createdBy / username)
    const realBySubca = new Map<string, {
      husAuditados: number;
      totalMissing: number;
      totalSurplus: number;
      totalCrossed: number;
      totalUnmanifested: number;
      totalOk: number;
      totalSystem: number;
      huIds: string[];
    }>();

    for (const a of audits) {
      const s = realBySubca.get(a.subca) ?? {
        husAuditados: 0, totalMissing: 0, totalSurplus: 0,
        totalCrossed: 0, totalUnmanifested: 0, totalOk: 0,
        totalSystem: 0, huIds: [],
      };
      s.husAuditados      += 1;
      s.totalMissing      += a.totalMissing;
      s.totalSurplus      += a.totalSurplus;
      s.totalCrossed      += a.totalCrossed;
      s.totalUnmanifested += a.totalUnmanifested;
      s.totalOk           += a.totalOk;
      s.totalSystem       += a.totalSystem;
      s.huIds.push(a.huId);
      realBySubca.set(a.subca, s);
    }

    return plan.items.map((item) => {
      const real    = realBySubca.get(item.subca);
      const realHus = real?.husAuditados ?? 0;
      return {
        subca:             item.subca,
        targetHus:         item.targetHus,
        realHus,
        cumplimiento:      pct(realHus, item.targetHus),
        totalSystem:       real?.totalSystem ?? 0,
        totalOk:           real?.totalOk ?? 0,
        totalMissing:      real?.totalMissing ?? 0,
        totalSurplus:      real?.totalSurplus ?? 0,
        totalCrossed:      real?.totalCrossed ?? 0,
        totalUnmanifested: real?.totalUnmanifested ?? 0,
        errorRate: real && real.totalSystem > 0
          ? Math.round(((real.totalMissing + real.totalSurplus + real.totalCrossed) / real.totalSystem) * 1000) / 10
          : 0,
      };
    });
  }, [plan, audits]);

  // Auditores reales por subca (extraídos de las auditorías cargadas)
  const auditorsBySubca = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of audits) {
      if (!map.has(a.subca)) map.set(a.subca, new Set());
      // assemblyUsers son los usuarios de armado — mostramos quién auditó el HU
      // como los auditores son quienes guardaron la auditoría (createdBy no tenemos nombre aquí)
      // mostramos assemblyUsers que es lo que está disponible en AuditResult
      for (const u of a.assemblyUsers) {
        map.get(a.subca)!.add(u);
      }
    }
    return map;
  }, [audits]);

  const totals = useMemo(() => ({
    planHus: analysis.reduce((s, r) => s + r.targetHus, 0),
    realHus: analysis.reduce((s, r) => s + r.realHus, 0),
  }), [analysis]);

  const exportExcel = () => {
    const rows = analysis.map((r) => ({
      'Sub-CA':       r.subca,
      'Plan HUs':     r.targetHus,
      'Real HUs':     r.realHus,
      'Cumplimiento': `${r.cumplimiento}%`,
      'Shipments':    r.totalSystem,
      'OK':           r.totalOk,
      'Faltantes':    r.totalMissing,
      'Sobrantes':    r.totalSurplus,
      'Cruzados':     r.totalCrossed,
      'Tasa error':   `${r.errorRate}%`,
      'Auditores':    [...(auditorsBySubca.get(r.subca) ?? [])].join(', '),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Array(11).fill({ wch: 16 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan');
    XLSX.writeFile(wb, `plan_${date}${shift ? '_' + shift : ''}.xlsx`);
  };

  return (
    <div className="space-y-6">

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">Turno</label>
          <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="input-base text-sm">
            <option value="">Todos</option>
            <option value="TM">TM</option>
            <option value="TT">TT</option>
            <option value="TN">TN</option>
          </select>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:bg-zinc-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
        {plan && !editing && (
          <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl">
            <Download size={12} /> Exportar Excel
          </button>
        )}
        {isAdmin && !editing && (
          <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm">
            <Target size={14} />
            {plan ? 'Editar plan' : 'Crear plan'}
          </button>
        )}
        {isAdmin && plan && !editing && (
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-xs">
            <Trash2 size={12} /> Eliminar plan
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={15} />{error}
        </div>
      )}

      {/* Formulario edición */}
      {editing && isAdmin && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
            <Target size={14} className="text-indigo-500" />
            Plan para {date}{shift ? ` — Turno ${shift}` : ''}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Sub-CA</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">HUs objetivo</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {editItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input type="text" value={item.subca} onChange={(e) => updateRow(i, 'subca', e.target.value)} placeholder="Ej: CA1" className="input-base w-full text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={1} value={item.targetHus} onChange={(e) => updateRow(i, 'targetHus', parseInt(e.target.value) || 1)} className="input-base w-24 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeRow(i)} className="text-zinc-300 hover:text-red-400 p-1 rounded">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <Plus size={14} /> Agregar sub-CA
            </button>
            <div className="flex-1" />
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Guardando...' : 'Guardar plan'}
            </button>
          </div>
        </div>
      )}

      {/* Sin plan */}
      {!plan && !editing && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Target size={20} className="text-zinc-300" />
          </div>
          <p className="text-zinc-500 font-medium">No hay plan para esta fecha</p>
          {isAdmin && <p className="text-zinc-400 text-sm mt-1">Hacé clic en "Crear plan" para agregar uno.</p>}
        </div>
      )}

      {/* Plan cargado */}
      {plan && !editing && (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'HUs planificados', value: totals.planHus,  color: 'text-indigo-600',  icon: Target },
              { label: 'HUs auditados',    value: totals.realHus,  color: 'text-emerald-600', icon: ClipboardList },
              { label: 'Cumplimiento',     value: `${pct(totals.realHus, totals.planHus)}%`,
                color: pct(totals.realHus, totals.planHus) >= 80 ? 'text-emerald-600' : 'text-red-600', icon: TrendingUp },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Gráfico Plan vs Real */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-700 mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-400" />
              Plan vs Real por Sub-CA
            </h3>
            {analysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analysis} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subca" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="targetHus" name="Planificado" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="realHus"   name="Auditado"    fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-zinc-400 text-sm text-center py-8">Sin auditorías para esta fecha/turno</p>
            )}
          </div>

          {/* Curva de cumplimiento */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-700 mb-4">% Cumplimiento por Sub-CA</h3>
            {analysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analysis} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subca" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 110]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="cumplimiento" name="Cumplimiento real" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" data={analysis.map((d) => ({ ...d, objetivo: 100 }))} dataKey="objetivo" name="Objetivo 100%" stroke="#d1d5db" strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-zinc-400 text-sm text-center py-8">Sin datos de cumplimiento</p>
            )}
          </div>

          {/* Tabla análisis */}
          <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-zinc-300">
                  <th className="px-4 py-3 text-left font-semibold">Sub-CA</th>
                  <th className="px-4 py-3 text-left font-semibold">Usuarios armado</th>
                  <th className="px-4 py-3 text-center font-semibold">Plan</th>
                  <th className="px-4 py-3 text-center font-semibold">Real</th>
                  <th className="px-4 py-3 text-center font-semibold">Cumplimiento</th>
                  <th className="px-4 py-3 text-center font-semibold">Shipments</th>
                  <th className="px-4 py-3 text-center font-semibold">OK</th>
                  <th className="px-4 py-3 text-center font-semibold">Faltantes</th>
                  <th className="px-4 py-3 text-center font-semibold">Cruzados</th>
                  <th className="px-4 py-3 text-center font-semibold">Tasa error</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-100">
                {analysis.map((row) => {
                  const cum = row.cumplimiento;
                  const cumColor = cum >= 100 ? 'text-emerald-600' : cum >= 70 ? 'text-yellow-600' : 'text-red-600';
                  const cumBg   = cum >= 100 ? 'bg-emerald-50 border-emerald-200' : cum >= 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                  const users = [...(auditorsBySubca.get(row.subca) ?? [])];
                  return (
                    <tr key={row.subca} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-semibold text-zinc-800">{row.subca}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs max-w-[160px] truncate" title={users.join(', ')}>
                        {users.length > 0 ? users.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-indigo-600">{row.targetHus}</td>
                      <td className="px-4 py-3 text-center font-medium text-emerald-600">{row.realHus}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${cumBg} ${cumColor}`}>{cum}%</span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-600">{row.totalSystem}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-medium">{row.totalOk}</td>
                      <td className="px-4 py-3 text-center"><span className={row.totalMissing > 0 ? 'text-red-500 font-bold' : 'text-zinc-300'}>{row.totalMissing}</span></td>
                      <td className="px-4 py-3 text-center"><span className={row.totalCrossed > 0 ? 'text-yellow-600 font-bold' : 'text-zinc-300'}>{row.totalCrossed}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold ${row.errorRate > 5 ? 'text-red-600' : row.errorRate > 0 ? 'text-yellow-600' : 'text-emerald-600'}`}>{row.errorRate}%</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-zinc-50 border-t-2 border-zinc-200 font-semibold text-sm">
                  <td className="px-4 py-3 text-zinc-700" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-center text-indigo-600">{totals.planHus}</td>
                  <td className="px-4 py-3 text-center text-emerald-600">{totals.realHus}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${pct(totals.realHus, totals.planHus) >= 100 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-yellow-50 border-yellow-200 text-yellow-600'}`}>
                      {pct(totals.realHus, totals.planHus)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-600">{analysis.reduce((s, r) => s + r.totalSystem, 0)}</td>
                  <td className="px-4 py-3 text-center text-emerald-600">{analysis.reduce((s, r) => s + r.totalOk, 0)}</td>
                  <td className="px-4 py-3 text-center text-red-500">{analysis.reduce((s, r) => s + r.totalMissing, 0)}</td>
                  <td className="px-4 py-3 text-center text-yellow-600">{analysis.reduce((s, r) => s + r.totalCrossed, 0)}</td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const s = analysis.reduce((t, r) => t + r.totalSystem, 0);
                      const e = analysis.reduce((t, r) => t + r.totalMissing + r.totalSurplus + r.totalCrossed, 0);
                      return <span className="text-zinc-600">{s > 0 ? `${Math.round(e / s * 1000) / 10}%` : '0%'}</span>;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Auditorías fuera del plan */}
          {(() => {
            const planned = new Set(plan.items.map((i) => i.subca));
            const extra   = audits.filter((a) => !planned.has(a.subca));
            if (extra.length === 0) return null;
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-yellow-700 mb-1">
                  ⚠ {extra.length} auditoría{extra.length > 1 ? 's' : ''} fuera del plan
                </p>
                <p className="text-xs text-yellow-600">
                  Sub-CAs no planificadas: {[...new Set(extra.map((a) => a.subca))].join(', ')}
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
