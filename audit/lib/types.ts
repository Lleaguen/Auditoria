// ── Tipos centrales del sistema de auditoría de HU ──────────────────────────

export interface ShipmentRow {
  shipmentId: string;
  inboundId: string;
  truckId: string;
  outboundId: string;       // Este es el número de HU
  dispatchId: string;
  dateCreated: string;
  nfe: string;
  hubStatus: string;
  rejectReason: string;
  inboundDateOpened: string;
  inboundDateIncluded: string;
  inboundDateClosed: string;
  inboundCarrierName: string;
  inboundUserId: string;
  inboundDockId: string;
  labelingDatePrinted: string;
  labelingAuthorizationDate: string;
  labelingLastPrintUser: string;
  labelingWorkstationId: string;
  weight: string;
  height: string;
  length: string;
  width: string;
  labelingCarrierName: string;
  labelingServiceId: string;
  labelingServiceName: string;
  labelingZone: string;       // Sub-CA
  trackingNumber: string;
  outboundDateOpened: string;
  outboundIncludedDate: string;
  outboundDateClosed: string;
  outboundUserIds: string;    // Usuario de armado
  outboundAddedBy: string;
  outboundPosition: string;
  dispatchIncludedDate: string;
  dispatchDateFinished: string;
  dispatchTruckId: string;
  dispatchUserId: string;
  dispatchDockId: string;
  priority: string;
  processType: string;
  sellerId: string;
  buyerId: string;
  lastMile: string;
  lastMileReimpressao: string;
  inBuffer: string;
  inBufferName: string;
  inBufferPromiseEdt: string;
  inBufferPromiseShipping: string;
  arrivedLastMile: string;
  arrivedNpym: string;
  wasReauthorized: string;
  cutoff: string;
  startPriorization: string;
  endPriorization: string;
  arrivalLogisticType: string;
  arrivalTrackingNumber: string;
  statusDescription: string;
}

// ── Resultado del análisis de un HU auditado ────────────────────────────────

export type ShipmentScanStatus =
  | 'ok'              // bipeado y coincide con sistema del HU
  | 'missing'         // en sistema pero no bipeado (faltante)
  | 'crossed'         // bipeado pero pertenece a otro HU (cruzado)
  | 'unmanifested';   // bipeado pero no existe en ningún HU del dataset (sin manifestar)

export interface ScannedShipment {
  shipmentId: string;
  status: ShipmentScanStatus;
  subca: string;
  statusDescription: string;
  labelingLastPrintUser: string;
  labelingAuthorizationDate: string;
  outboundUserIds: string;
  dispatched: boolean;
  crossedFromHu?: string;  // HU origen si es cruzado
}

export interface AuditResult {
  id?: number;          // id asignado por la DB (presente cuando viene del backend)
  huId: string;
  date: string;
  shift: string;
  subca: string;
  observations: string;          // observaciones libres del auditor
  systemShipments: string[];
  scannedShipments: string[];
  results: ScannedShipment[];
  totalSystem: number;
  totalScanned: number;
  totalOk: number;
  totalMissing: number;
  totalCrossed: number;
  totalUnmanifested: number;
  assemblyUsers: string[];
  crossedHus: string[];
}

// ── Datos para el dashboard ──────────────────────────────────────────────────

export interface DailyStats {
  date: string;
  totalHusAudited: number;
  husWithDeviation: number;
  percentHusWithDeviation: number;
  totalShipmentsAudited: number;
  totalMissing: number;
  totalCrossed: number;
  totalUnmanifested: number;
  totalDamaged: number;
  percentWithErrors: number;
}

export interface SubcaStats {
  subca: string;
  totalAuditados: number;
  totalFaltantes: number;
  totalSobrantes: number;
  totalAnalizados: number;
  husAuditados: number;
  usuarioArmado: string;
  huAuditadosPorUsuario: number;
  faltantes: number;
  sobrantes: number;
  totalAnalizadosSubca: number;
}

export interface UserStats {
  userId: string;
  totalHus: number;
  totalShipments: number;
  totalErrors: number;
  errorRate: number;
}

// ── Turno ────────────────────────────────────────────────────────────────────
export type Shift = 'TT' | 'TN' | 'TM' | '';
