'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import type { ShipmentRow, AuditResult } from './types';

// ── Estado global ────────────────────────────────────────────────────────────

interface AppState {
  csvData: ShipmentRow[];        // Dataset cargado
  csvFileName: string;
  audits: AuditResult[];         // Historial de auditorías guardadas
}

type Action =
  | { type: 'SET_CSV'; payload: { data: ShipmentRow[]; fileName: string } }
  | { type: 'ADD_AUDIT'; payload: AuditResult }
  | { type: 'DELETE_AUDIT'; payload: string }   // huId
  | { type: 'LOAD_AUDITS'; payload: AuditResult[] }
  | { type: 'CLEAR_CSV' };

const STORAGE_KEY = 'hu_audit_history';

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CSV':
      return {
        ...state,
        csvData: action.payload.data,
        csvFileName: action.payload.fileName,
      };
    case 'CLEAR_CSV':
      return { ...state, csvData: [], csvFileName: '' };
    case 'ADD_AUDIT': {
      // Reemplaza si ya existe la misma auditoría (mismo HU + fecha)
      const filtered = state.audits.filter(
        (a) =>
          !(a.huId === action.payload.huId && a.date === action.payload.date)
      );
      return { ...state, audits: [action.payload, ...filtered] };
    }
    case 'DELETE_AUDIT':
      return {
        ...state,
        audits: state.audits.filter((a) => a.huId !== action.payload),
      };
    case 'LOAD_AUDITS':
      return { ...state, audits: action.payload };
    default:
      return state;
  }
}

// ── Contexto ─────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  setCsv: (data: ShipmentRow[], fileName: string) => void;
  clearCsv: () => void;
  addAudit: (audit: AuditResult) => void;
  deleteAudit: (huId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    csvData: [],
    csvFileName: '',
    audits: [],
  });

  // Cargar historial de localStorage al iniciar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuditResult[];
        dispatch({ type: 'LOAD_AUDITS', payload: parsed });
      }
    } catch {
      // ignora errores de parseo
    }
  }, []);

  // Persiste auditorías en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.audits));
    } catch {
      // cuota excedida u otro error
    }
  }, [state.audits]);

  const setCsv = useCallback((data: ShipmentRow[], fileName: string) => {
    dispatch({ type: 'SET_CSV', payload: { data, fileName } });
  }, []);

  const clearCsv = useCallback(() => {
    dispatch({ type: 'CLEAR_CSV' });
  }, []);

  const addAudit = useCallback((audit: AuditResult) => {
    dispatch({ type: 'ADD_AUDIT', payload: audit });
  }, []);

  const deleteAudit = useCallback((huId: string) => {
    dispatch({ type: 'DELETE_AUDIT', payload: huId });
  }, []);

  return (
    <AppContext.Provider value={{ state, setCsv, clearCsv, addAudit, deleteAudit }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppProvider');
  return ctx;
}
