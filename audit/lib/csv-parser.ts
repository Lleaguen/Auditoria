import Papa from 'papaparse';
import type { ShipmentRow } from './types';

// Mapa de columnas del CSV a los campos de ShipmentRow
const COLUMN_MAP: Record<string, keyof ShipmentRow> = {
  'Shipment ID': 'shipmentId',
  'Inbound ID': 'inboundId',
  'Truck ID': 'truckId',
  'Outbound ID': 'outboundId',
  'Dispatch ID': 'dispatchId',
  'Date Created': 'dateCreated',
  'NFE': 'nfe',
  'Hub Status': 'hubStatus',
  'Reject Reason': 'rejectReason',
  'Inbound Date Opened': 'inboundDateOpened',
  'Inbound Date Included': 'inboundDateIncluded',
  'Inbound Date Closed': 'inboundDateClosed',
  'Inbound Carrier Name': 'inboundCarrierName',
  'Inbound User ID': 'inboundUserId',
  'Inbound Dock ID': 'inboundDockId',
  'Labeling Date Printed': 'labelingDatePrinted',
  'Labeling Authorization Date': 'labelingAuthorizationDate',
  'Labeling Last Print User': 'labelingLastPrintUser',
  'Labeling Workstation ID': 'labelingWorkstationId',
  'Weight': 'weight',
  'Height': 'height',
  'Length': 'length',
  'Width': 'width',
  'Labeling Carrier Name': 'labelingCarrierName',
  'Labeling Service Id': 'labelingServiceId',
  'Labeling Service Name': 'labelingServiceName',
  'Labeling Zone': 'labelingZone',
  'Tracking Number': 'trackingNumber',
  'Outbound Date Opened': 'outboundDateOpened',
  'Outbound Included Date': 'outboundIncludedDate',
  'Outbound Date Closed': 'outboundDateClosed',
  'Outbound User IDs': 'outboundUserIds',
  'Outbound Added By': 'outboundAddedBy',
  'Outbound Position': 'outboundPosition',
  'Dispatch Included Date': 'dispatchIncludedDate',
  'Dispatch Date Finished': 'dispatchDateFinished',
  'Dispatch Truck ID': 'dispatchTruckId',
  'Dispatch User ID': 'dispatchUserId',
  'Dispatch Dock ID': 'dispatchDockId',
  'Priority': 'priority',
  'Process Type': 'processType',
  'Seller ID': 'sellerId',
  'Buyer ID': 'buyerId',
  'LastMile': 'lastMile',
  'LastMile Reimpressão': 'lastMileReimpressao',
  'InBuffer': 'inBuffer',
  'InBuffer Name': 'inBufferName',
  'InBuffer Promise EDT': 'inBufferPromiseEdt',
  'InBuffer Promise Shipping': 'inBufferPromiseShipping',
  'Arrived LastMile': 'arrivedLastMile',
  'Arrived Npym': 'arrivedNpym',
  'Was Reauthorized': 'wasReauthorized',
  'Cutoff': 'cutoff',
  'Start Priorization': 'startPriorization',
  'End Priorization': 'endPriorization',
  'Arrival Logistic Type': 'arrivalLogisticType',
  'Arrival Tracking Number': 'arrivalTrackingNumber',
  'Status Description': 'statusDescription',
};

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s+/g, ' ');
}

export function parseCSV(text: string): ShipmentRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
    delimiter: ',',
  });

  return result.data.map((raw) => {
    const row: Partial<ShipmentRow> = {};
    for (const [csvCol, field] of Object.entries(COLUMN_MAP)) {
      const normalizedCol = normalizeHeader(csvCol);
      // Busca la columna exacta o con variantes de encoding
      const value =
        raw[normalizedCol] ??
        raw[csvCol] ??
        raw[csvCol.replace('ã', 'Ã£')] ??
        '';
      (row as Record<string, string>)[field] = String(value).trim();
    }
    return row as ShipmentRow;
  }).filter((r) => r.shipmentId && r.shipmentId.length > 0);
}

/**
 * Convierte notación científica con separador decimal punto O coma a string de dígitos.
 * Usa BigInt para evitar pérdida de precisión.
 *
 * IMPORTANTE: el CSV puede tener precisión reducida (ej: "2,4178E+15" representa
 * "241780000000000X" — solo los primeros dígitos son confiables).
 * Por eso la búsqueda por HU usa matchHuId() en vez de igualdad exacta.
 */
export function normalizeShipmentId(id: string): string {
  const clean = id.trim().replace(/\s/g, '');
  if (!clean) return '';

  // Detecta notación científica con punto o coma decimal: "2,4178E+15" / "2.4178E+15"
  const sciRegex = /^(\d+)[.,](\d+)[Ee][+]?(\d+)$/;
  const match = clean.match(sciRegex);
  if (match) {
    const intPart = match[1];
    const decPart = match[2];
    const exp = parseInt(match[3], 10);
    // Construye la mantisa completa: "24178"
    const mantissa = intPart + decPart;
    const finalExp = exp - decPart.length;
    if (finalExp >= 0) {
      try {
        const result = BigInt(mantissa) * BigInt(10) ** BigInt(finalExp);
        return result.toString();
      } catch {
        return clean;
      }
    }
    return clean;
  }

  // Notación científica sin decimales: "24178E+11"
  const sciNoDecRegex = /^(\d+)[Ee][+]?(\d+)$/;
  const match2 = clean.match(sciNoDecRegex);
  if (match2) {
    try {
      const result = BigInt(match2[1]) * BigInt(10) ** BigInt(parseInt(match2[2], 10));
      return result.toString();
    } catch {
      return clean;
    }
  }

  return clean;
}

/**
 * Compara un outboundId del CSV con un HU ingresado por el usuario.
 *
 * Soporta dos casos:
 * 1. CSV con valor exacto (exportado como texto): igualdad directa.
 * 2. CSV con notación científica truncada (ej: "2417800000000000" de "2,4178E+15"):
 *    compara por prefijo de dígitos significativos.
 */
export function matchHuId(csvOutboundId: string, inputHuId: string): boolean {
  if (!csvOutboundId || !inputHuId) return false;

  // Caso 1: igualdad exacta (CSV exportado como texto, valor completo)
  if (csvOutboundId === inputHuId) return true;

  // Caso 2: el ID del CSV tiene ceros de relleno al final (truncado por notación científica)
  // Detecta cuántos dígitos significativos tiene el valor del CSV
  const trailingZeros = csvOutboundId.match(/0+$/)?.[0].length ?? 0;
  const sigDigits = csvOutboundId.length - trailingZeros;

  // Solo aplicar prefijo si hay una cantidad razonable de dígitos sig. (4+)
  // y el input es más largo que el CSV (indicando que el CSV está truncado)
  if (sigDigits >= 4 && inputHuId.length > csvOutboundId.length) {
    return csvOutboundId.substring(0, sigDigits) === inputHuId.substring(0, sigDigits);
  }

  return false;
}

// Normaliza las columnas de ID en una fila del CSV
export function normalizeRow(row: ShipmentRow): ShipmentRow {
  return {
    ...row,
    shipmentId: normalizeShipmentId(row.shipmentId),
    outboundId: normalizeShipmentId(row.outboundId),
    dispatchId: normalizeShipmentId(row.dispatchId),
  };
}
