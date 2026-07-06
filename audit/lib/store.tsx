'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
} from 'react';
import type { ShipmentRow, AuditResult } from './types';
import { fetchAudits, saveAudit, deleteAuditById, checkBackendHealth } from './api';

// ── Estado global ────────────────────────────────────────────────────────────

interface AppState {
  csvData: ShipmentRow[];
  csvFileName: string;
  audits: AuditResult[];
  backendOnline: boolean;
  loadingAudits: boolean;
}

type Action =
  | { type: 'SET_CSV'; payload: { data: ShipmentRow[]; fileName: string } }
  | { type: 'CLEAR_CSV' }
  | { type: 'SET_AUDITS'; payload: AuditResult[] }
  | { type: 'ADD_AUDIT'; payload: AuditResult }
  | { type: 'REMOVE_AUDIT'; payload: number }          // id de DB
  | { type: 'SET_BACKEND_ONLINE'; payload: boolean }
  | { type: 'SET_LOADING_AUDITS'; payload: boolean };

// Normaliza una auditoría para garantizar que todos los campos numéricos existen.
// Necesario para auditorías creadas antes de que se agregaran nuevos campos.
function normalizeAudit(a: AuditResult): AuditResult {
  return {
    ...a,
    totalSurplus:  a.totalSurplus  ?? 0,
    totalCrossed:  a.totalCrossed  ?? 0,
    crossedHus:    a.crossedHus    ?? [],
    assemblyUsers: a.assemblyUsers ?? [],
    results:       a.results       ?? [],
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CSV':
      return { ...state, csvData: action.payload.data, csvFileName: action.payload.fileName };
    case 'CLEAR_CSV':
      return { ...state, csvData: [], csvFileName: '' };
    case 'SET_AUDITS':
      return { ...state, audits: action.payload.map(normalizeAudit) };
    case 'ADD_AUDIT': {
      const normalized = normalizeAudit(action.payload);
      const filtered = state.audits.filter(
        (a) => !(a.huId === normalized.huId && a.date === normalized.date)
      );
      return { ...state, audits: [normalized, ...filtered] };
    }
    case 'REMOVE_AUDIT':
      return {
        ...state,
        audits: state.audits.filter((a) => (a as AuditResult & { id?: number }).id !== action.payload),
      };
    case 'SET_BACKEND_ONLINE':
      return { ...state, backendOnline: action.payload };
    case 'SET_LOADING_AUDITS':
      return { ...state, loadingAudits: action.payload };
    default:
      return state;
  }
}

// ── Contexto ─────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  setCsv: (data: ShipmentRow[], fileName: string) => void;
  clearCsv: () => void;
  addAudit: (audit: AuditResult) => Promise<void>;
  deleteAudit: (id: number) => Promise<void>;
  reloadAudits: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    csvData: [],
    csvFileName: '',
    audits: [],
    backendOnline: false,
    loadingAudits: true,
  });

  // ── Verificar backend y cargar auditorías al iniciar ─────────────────────
  const reloadAudits = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_AUDITS', payload: true });
    try {
      const online = await checkBackendHealth();
      dispatch({ type: 'SET_BACKEND_ONLINE', payload: online });

      if (online) {
        const audits = await fetchAudits();
        dispatch({ type: 'SET_AUDITS', payload: audits });
      }
    } catch (err) {
      console.error('[Store] Error al cargar auditorías:', err);
      dispatch({ type: 'SET_BACKEND_ONLINE', payload: false });
    } finally {
      dispatch({ type: 'SET_LOADING_AUDITS', payload: false });
    }
  }, []);

  useEffect(() => {
    reloadAudits();
  }, [reloadAudits]);

  // ── Guardar auditoría en backend ─────────────────────────────────────────
  const addAudit = useCallback(async (audit: AuditResult) => {
    try {
      const saved = await saveAudit(audit);
      dispatch({ type: 'ADD_AUDIT', payload: saved });
    } catch (err) {
      console.error('[Store] Error al guardar auditoría:', err);
      throw err;
    }
  }, []);

  // ── Eliminar auditoría por id de DB ──────────────────────────────────────
  const deleteAudit = useCallback(async (id: number) => {
    try {
      await deleteAuditById(id);
      dispatch({ type: 'REMOVE_AUDIT', payload: id });
    } catch (err) {
      console.error('[Store] Error al eliminar auditoría:', err);
      throw err;
    }
  }, []);

  const setCsv = useCallback((data: ShipmentRow[], fileName: string) => {
    dispatch({ type: 'SET_CSV', payload: { data, fileName } });
  }, []);

  const clearCsv = useCallback(() => {
    dispatch({ type: 'CLEAR_CSV' });
  }, []);

  return (
    <AppContext.Provider value={{ state, setCsv, clearCsv, addAudit, deleteAudit, reloadAudits }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppProvider');
  return ctx;
}
