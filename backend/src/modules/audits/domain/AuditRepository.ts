import { Audit } from './Audit';

// ── Puerto (interfaz hexagonal) ──────────────────────────────────────────────
// Los casos de uso dependen de esta abstracción, nunca de la implementación

export interface AuditFilters {
  date?: string;
  shift?: string;
  subca?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AuditRepository {
  /**
   * Guarda una auditoría. Si ya existe (mismo huId + date), la reemplaza.
   * Retorna la auditoría con el id asignado.
   */
  save(audit: Audit): Promise<Audit>;

  /** Retorna todas las auditorías, opcionalmente filtradas */
  findAll(filters?: AuditFilters): Promise<Audit[]>;

  /** Retorna una auditoría por su id de DB */
  findById(id: number): Promise<Audit | null>;

  /** Retorna una auditoría por huId + date */
  findByHuAndDate(huId: string, date: string): Promise<Audit | null>;

  /** Elimina una auditoría por id. Retorna true si se eliminó */
  delete(id: number): Promise<boolean>;

  /** Cuenta total de auditorías (con filtros opcionales) */
  count(filters?: AuditFilters): Promise<number>;
}
