// ── Entidad de dominio ───────────────────────────────────────────────────────
// Espeja AuditResult + ScannedShipment del frontend, sin dependencias externas

export type ShipmentScanStatus = 'ok' | 'missing' | 'surplus' | 'crossed';

export type Shift = 'TT' | 'TN' | 'TM' | '';

export interface ScannedShipmentResult {
  shipmentId: string;
  status: ShipmentScanStatus;
  subca: string;
  statusDescription: string;
  labelingLastPrintUser: string;
  labelingAuthorizationDate: string;
  outboundUserIds: string;
  dispatched: boolean;
  crossedFromHu?: string;
}

export interface Audit {
  id?: number;           // asignado por la DB al persistir
  huId: string;
  date: string;
  shift: Shift;
  subca: string;
  systemShipments: string[];
  scannedShipments: string[];
  results: ScannedShipmentResult[];
  totalSystem: number;
  totalScanned: number;
  totalOk: number;
  totalMissing: number;
  totalSurplus: number;
  totalCrossed: number;
  assemblyUsers: string[];
  crossedHus: string[];
  createdAt?: string;
}

// ── Validación básica de dominio ─────────────────────────────────────────────

export function validateAudit(audit: Partial<Audit>): string[] {
  const errors: string[] = [];

  if (!audit.huId || audit.huId.trim() === '') {
    errors.push('huId es requerido');
  }
  if (!audit.date || audit.date.trim() === '') {
    errors.push('date es requerido');
  }
  if (!Array.isArray(audit.results)) {
    errors.push('results debe ser un array');
  }

  const validShifts: Shift[] = ['TT', 'TN', 'TM', ''];
  if (audit.shift !== undefined && !validShifts.includes(audit.shift)) {
    errors.push(`shift inválido: ${audit.shift}. Valores válidos: TT, TN, TM`);
  }

  return errors;
}
