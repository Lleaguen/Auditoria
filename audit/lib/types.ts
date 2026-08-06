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
  | 'surplus'         // bipeado pero no estaba en sistema (sobrante)
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
  id?: number;
  huId: string;
  date: string;
  shift: string;
  subca: string;
  observations: string;
  systemShipments: string[];
  scannedShipments: string[];
  results: ScannedShipment[];
  totalSystem: number;
  totalScanned: number;
  totalOk: number;
  totalMissing: number;
  totalSurplus: number;
  totalCrossed: number;
  totalUnmanifested: number;
  assemblyUsers: string[];
  crossedHus: string[];
  createdBy?: number;
  createdByName?: string; // resuelto en el store si está disponible
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

// ── Post-Audit ────────────────────────────────────────────────────────────────

export type PostAuditStatusPre   = 'in_hu';
export type PostAuditStatusAudit = 'missing' | 'surplus' | 'crossed';
export type PostAuditStatusPost  =
  | 'removed'           // faltante eliminado del HU ✅
  | 'still_in_hu'       // faltante sigue en el HU ❌
  | 'added_to_hu'       // sobrante agregado al HU ✅
  | 'not_in_hu'         // sobrante no fue agregado ❌
  | 'different_subca'   // sobrante de otra Sub-CA — no aplica
  | 'moved_to_correct_hu' // cruzado movido al HU correcto ✅
  | 'still_crossed'     // cruzado sigue en el HU incorrecto ❌
  | 'not_found_post'    // no aparece en el CSV post
  | 'n/a';

export interface PostAuditShipmentResult {
  id?: number;
  shipmentId:     string;
  statusPre:      PostAuditStatusPre;
  statusAudit:    PostAuditStatusAudit;
  statusPost:     PostAuditStatusPost;
  huPre:          string;
  huPost:         string;
  subca:          string;
  corrected:      boolean;
  correctionNote: string;
}

export interface PostAuditResult {
  id?: number;
  auditId:              number;
  huId:                 string;
  auditDate:            string;
  auditSubca:           string;
  postDate:             string;
  csvFilename:          string;
  createdBy?:           number;
  createdAt?:           string;
  totalErrorsFound:     number;
  totalErrorsCorrected: number;
  results:              PostAuditShipmentResult[];
}

export interface CorrectionStat {
  user_id:                    number;
  nombre:                     string;
  username:                   string;
  post_audits_realizados:     number;
  total_errores_encontrados:  number;
  total_errores_corregidos:   number;
  tasa_correccion:            number;
}
