'use client';

import React, { useState, useCallback, useRef } from 'react';
import { parseCSV, normalizeRow } from '@/lib/csv-parser';
import { fetchAudits, savePostAudit, fetchPostAudits, deletePostAudit } from '@/lib/api';
import type { AuditResult, PostAuditResult, PostAuditShipmentResult } from '@/lib/types';
import * as XLSX from 'xlsx';
import {
  Upload, Search, CheckCircle2, XCircle, AlertCircle,
  Download, Trash2, RefreshCw, FileSpreadsheet, ChevronDown, ChevronRight,
} from 'lucide-react';

// ── Helpers de display ────────────────────────────────────────────────────────

const AUDIT_LABEL: Record<string, string> = {
  missing: 'Faltante',
  surplus: 'Sobrante',
  crossed: 'Cruzado',
};

const POST_LABEL: Record<string, { label: string; color: string; icon: 'ok' | 'err' | 'na' }> = {
  removed:            { label: 'Eliminado del HU ✓',        color: 'text-emerald-600', icon: 'ok' },
  added_to_hu:        { label: 'Agregado al HU ✓',          color: 'text-emerald-600', icon: 'ok' },
  moved_to_correct_hu:{ label: 'Movido al HU correcto ✓',   color: 'text-emerald-600', icon: 'ok' },
  not_found_post:     { label: 'No encontrado (corregido?)', color: 'text-emerald-500', icon: 'ok' },
  still_in_hu:        { label: 'Sigue en el HU ✗',          color: 'text-red-600',     icon: 'err' },
  not_in_hu:          { label: 'No fue agregado ✗',         color: 'text-red-600',     icon: 'err' },
  still_crossed:      { label: 'Sigue cruzado ✗',           color: 'text-red-600',     icon: 'err' },
  different_subca:    { label: 'Otra Sub-CA — N/A',         color: 'text-zinc-400',    icon: 'na'  },
  'n/a':              { label: '—',                          color: 'text-zinc-300',    icon: 'na'  },
};

function StatusIcon({ icon }: { icon: 'ok' | 'err' | 'na' }) {
  if (icon === 'ok')  return <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />;
  if (icon === 'err') return <XCircle      size={13} className="text-red-500 shrink-0" />;
  return <span className="w-3.5 h-3.5 shrink-0" />;
}

// ── Exportar Excel ────────────────────────────────────────────────────────────

function exportToExcel(pa: PostAuditResult) {
  const rows = pa.results.map((r) => ({
    'Shipment ID':       r.shipmentId,
    'Sub-CA':            r.subca,
    'Error detectado':   AUDIT_LABEL[r.statusAudit] ?? r.statusAudit,
    'HU (PRE)':          r.huPre,
    'Estado PRE':        'En HU',
    'Estado AUDIT':      AUDIT_LABEL[r.statusAudit] ?? r.statusAudit,
    'HU (POST)':         r.huPost || '—',
    'Estado POST':       POST_LABEL[r.statusPost]?.label ?? r.statusPost,
    'Corregido':         r.corrected ? 'Sí' : 'No',
    'Nota':              r.correctionNote,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Array(10).fill({ wch: 24 });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Post-Audit');
  XLSX.writeFile(wb, `post_audit_${pa.huId}_${pa.postDate}.xlsx`);
}

// ── Componente tabla de resultados ────────────────────────────────────────────

function ResultTable({ results }: { results: PostAuditShipmentResult[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zinc-900 text-zinc-300">
            <th className="px-3 py-2.5 text-left font-semibold">Shipment ID</th>
            <th className="px-3 py-2.5 text-left font-semibold">Sub-CA</th>
            {/* PRE */}
            <th className="px-3 py-2.5 text-center font-semibold bg-zinc-800 border-x border-zinc-700">
              HU PRE
            </th>
            <th className="px-3 py-2.5 text-center font-semibold bg-zinc-800 border-r border-zinc-700">
              Estado PRE
            </th>
            {/* AUDIT */}
            <th className="px-3 py-2.5 text-center font-semibold bg-indigo-900/60 border-x border-indigo-800">
              Estado AUDIT
            </th>
            {/* POST */}
            <th className="px-3 py-2.5 text-center font-semibold bg-zinc-800 border-x border-zinc-700">
              HU POST
            </th>
            <th className="px-3 py-2.5 text-center font-semibold bg-zinc-800 border-r border-zinc-700">
              Estado POST
            </th>
            <th className="px-3 py-2.5 text-center font-semibold">Corregido</th>
            <th className="px-3 py-2.5 text-left font-semibold">Nota</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-zinc-100">
          {results.map((r) => {
            const postInfo = POST_LABEL[r.statusPost] ?? { label: r.statusPost, color: 'text-zinc-500', icon: 'na' as const };
            return (
              <tr key={r.shipmentId} className="hover:bg-zinc-50">
                <td className="px-3 py-2 font-mono text-zinc-700 text-[11px]">{r.shipmentId}</td>
                <td className="px-3 py-2 text-zinc-500">{r.subca}</td>
                <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-500 bg-zinc-50">{r.huPre}</td>
                <td className="px-3 py-2 text-center bg-zinc-50">
                  <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[11px] font-medium">En HU</span>
                </td>
                <td className="px-3 py-2 text-center bg-indigo-50/40">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    r.statusAudit === 'missing' ? 'bg-red-100 text-red-700' :
                    r.statusAudit === 'surplus' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {AUDIT_LABEL[r.statusAudit] ?? r.statusAudit}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-500 bg-zinc-50">
                  {r.huPost || '—'}
                </td>
                <td className="px-3 py-2 bg-zinc-50">
                  <div className={`flex items-center gap-1.5 justify-center ${postInfo.color}`}>
                    <StatusIcon icon={postInfo.icon as 'ok' | 'err' | 'na'} />
                    <span className="text-[11px] font-medium">{postInfo.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  {r.corrected
                    ? <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                    : r.statusPost === 'different_subca'
                      ? <span className="text-zinc-300 text-[11px]">N/A</span>
                      : <XCircle size={15} className="text-red-400 mx-auto" />
                  }
                </td>
                <td className="px-3 py-2 text-zinc-400 text-[11px] max-w-[200px]">{r.correctionNote}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tarjeta de post-audit guardado ────────────────────────────────────────────

function PostAuditCard({
  pa, onDelete,
}: { pa: PostAuditResult; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const rate = pa.totalErrorsFound > 0
    ? Math.round((pa.totalErrorsCorrected / pa.totalErrorsFound) * 1000) / 10
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-50 select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
        <div className="flex-1">
          <p className="font-semibold text-zinc-800 text-sm">HU {pa.huId}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Auditoría {pa.auditDate} · Post-audit {pa.postDate} · Sub-CA {pa.auditSubca}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-400">Errores encontrados</p>
            <p className="font-bold text-zinc-700">{pa.totalErrorsFound}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Corregidos</p>
            <p className="font-bold text-emerald-600">{pa.totalErrorsCorrected}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
            rate >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            rate >= 50 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
            'bg-red-50 border-red-200 text-red-700'
          }`}>
            {rate}% corregido
          </div>
          <button onClick={(e) => { e.stopPropagation(); exportToExcel(pa); }}
            className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Exportar Excel">
            <Download size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (pa.id) onDelete(pa.id); }}
            className="p-1.5 text-zinc-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-100">
          <ResultTable results={pa.results} />
        </div>
      )}
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────

export default function PostAuditPanel() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [csvRows, setCsvRows]         = useState<ReturnType<typeof normalizeRow>[]>([]);
  const [csvFilename, setCsvFilename] = useState('');
  const [loadingCsv, setLoadingCsv]   = useState(false);
  const [csvError, setCsvError]       = useState('');

  const [audits, setAudits]           = useState<AuditResult[]>([]);
  const [postAudits, setPostAudits]   = useState<PostAuditResult[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');

  // Cargar auditorías con errores + post-audits existentes
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError('');
    try {
      const [auditData, paData] = await Promise.all([
        fetchAudits({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
        fetchPostAudits(),
      ]);
      // Solo auditorías que tienen errores
      setAudits(auditData.filter((a) =>
        a.totalMissing > 0 || a.totalSurplus > 0 || a.totalCrossed > 0
      ));
      setPostAudits(paData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoadingData(false);
    }
  }, [fromDate, toDate]);

  React.useEffect(() => { loadData(); }, [loadData]);

  // Cargar CSV post
  const handleFile = useCallback(async (file: File) => {
    setLoadingCsv(true);
    setCsvError('');
    try {
      const text = await file.text();
      const rows = parseCSV(text).map(normalizeRow);
      if (rows.length === 0) { setCsvError('El CSV está vacío o no se pudo parsear.'); return; }
      setCsvRows(rows);
      setCsvFilename(file.name);
    } catch {
      setCsvError('Error al procesar el archivo.');
    } finally {
      setLoadingCsv(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // Ejecutar post-audit para una auditoría
  const handleRun = useCallback(async (audit: AuditResult) => {
    if (csvRows.length === 0) { setError('Primero cargá el CSV post.'); return; }
    setSaving(true);
    setError('');
    try {
      const postShipments = csvRows.map((r) => ({
        shipmentId:   r.shipmentId,
        outboundId:   r.outboundId,
        labelingZone: r.labelingZone,
      }));
      const result = await savePostAudit({
        auditId:       audit.id!,
        postDate:      new Date().toISOString().slice(0, 10),
        csvFilename,
        postShipments,
      });
      setPostAudits((prev) => {
        const filtered = prev.filter((p) => p.auditId !== audit.id);
        return [result, ...filtered];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar post-audit');
    } finally {
      setSaving(false);
    }
  }, [csvRows, csvFilename]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('¿Eliminar este post-audit?')) return;
    await deletePostAudit(id);
    setPostAudits((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Auditorías que ya tienen post-audit
  const doneAuditIds = new Set(postAudits.map((p) => p.auditId));

  return (
    <div className="space-y-6">

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">Desde</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-base text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-1.5">Hasta</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-base text-sm" />
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-500 hover:bg-zinc-50">
          <RefreshCw size={12} className={loadingData ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={15} />{error}
        </div>
      )}

      {/* Uploader CSV post */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-700 mb-3 flex items-center gap-2">
          <FileSpreadsheet size={14} className="text-indigo-500" />
          1. Cargar CSV post-auditoría
        </h2>

        {csvRows.length === 0 ? (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
          >
            <Upload size={22} className="text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 font-medium">Arrastrá el CSV o hacé clic para seleccionar</p>
            <p className="text-xs text-zinc-400 mt-1">El mismo formato de siempre — estado actual del sistema</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
            {loadingCsv && <p className="text-xs text-indigo-500 mt-2 animate-pulse">Procesando...</p>}
            {csvError && <p className="text-xs text-red-500 mt-2">{csvError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">{csvFilename}</p>
              <p className="text-xs text-emerald-600">{csvRows.length.toLocaleString()} shipments cargados</p>
            </div>
            <button onClick={() => { setCsvRows([]); setCsvFilename(''); }}
              className="text-emerald-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Lista de auditorías con errores para procesar */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-zinc-700 mb-3 flex items-center gap-2">
          <Search size={14} className="text-indigo-500" />
          2. Seleccioná la auditoría a comparar
        </h2>

        {audits.length === 0 && !loadingData ? (
          <p className="text-sm text-zinc-400 text-center py-6">No hay auditorías con errores en el rango seleccionado.</p>
        ) : (
          <div className="space-y-2">
            {audits.map((a) => {
              const done = doneAuditIds.has(a.id!);
              return (
                <div key={a.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${done ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-zinc-800 text-sm">{a.huId}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {a.date} · {a.subca} ·&nbsp;
                      {a.totalMissing > 0 && <span className="text-red-500">{a.totalMissing} faltantes </span>}
                      {a.totalSurplus > 0 && <span className="text-orange-500">{a.totalSurplus} sobrantes </span>}
                      {a.totalCrossed > 0 && <span className="text-yellow-600">{a.totalCrossed} cruzados</span>}
                    </p>
                  </div>
                  {done && <span className="text-xs text-emerald-600 font-semibold">Post-audit realizado ✓</span>}
                  <button
                    onClick={() => handleRun(a)}
                    disabled={saving || csvRows.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? <RefreshCw size={11} className="animate-spin" /> : <Search size={11} />}
                    {done ? 'Re-analizar' : 'Analizar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resultados guardados */}
      {postAudits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Post-audits realizados
          </h2>
          {postAudits.map((pa) => (
            <PostAuditCard key={pa.id} pa={pa} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
