import type {
  ShipmentRow,
  AuditResult,
  ScannedShipment,
} from './types';
import { matchHuId } from './csv-parser';

/**
 * Dado el dataset completo y un HU (outboundId),
 * devuelve todos los shipments que pertenecen a ese HU según el sistema.
 * Usa matchHuId para tolerar la pérdida de precisión del CSV (notación científica).
 */
export function getShipmentsForHu(
  data: ShipmentRow[],
  huId: string
): ShipmentRow[] {
  const normalized = huId.trim();
  return data.filter((r) => matchHuId(r.outboundId, normalized));
}

/**
 * Motor principal de auditoría:
 * Compara la lista del sistema con los IDs bipeados.
 */
export function runAudit(
  data: ShipmentRow[],
  huId: string,
  scannedIds: string[],
  date: string,
  shift: string,
  observations: string = ''
): AuditResult {
  const systemRows = getShipmentsForHu(data, huId);

  // Sub-CA principal del HU (la más frecuente entre los del sistema)
  const subcaCount = new Map<string, number>();
  for (const r of systemRows) {
    const z = r.labelingZone || 'N/A';
    subcaCount.set(z, (subcaCount.get(z) ?? 0) + 1);
  }
  const mainSubca =
    [...subcaCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

  // Usuarios de armado únicos del HU
  const assemblyUsersSet = new Set<string>();
  for (const r of systemRows) {
    if (r.outboundUserIds) {
      const cleaned = r.outboundUserIds.replace(/[\[\]]/g, '');
      cleaned.split(',').forEach((u) => {
        const t = u.trim();
        if (t) assemblyUsersSet.add(t);
      });
    }
  }

  const scannedSet = new Set(scannedIds.map((s) => s.trim()));
  const systemIds = new Set(systemRows.map((r) => r.shipmentId));

  const results: ScannedShipment[] = [];

  // 1. Verificar los del sistema: OK o FALTANTE
  for (const row of systemRows) {
    const scanned = scannedSet.has(row.shipmentId);
    const dispatched =
      (row.statusDescription || row.hubStatus || '')
        .toLowerCase()
        .includes('dispatch') ||
      (row.hubStatus || '').toLowerCase().includes('dispatch');

    results.push({
      shipmentId: row.shipmentId,
      status: scanned ? 'ok' : 'missing',
      subca: row.labelingZone || 'N/A',
      statusDescription: row.statusDescription || row.hubStatus || '',
      labelingLastPrintUser: row.labelingLastPrintUser || '',
      labelingAuthorizationDate: row.labelingAuthorizationDate || '',
      outboundUserIds: row.outboundUserIds || '',
      dispatched,
    });
  }

  // 2. Verificar los bipeados que no están en sistema: CRUZADO o SIN MANIFESTAR
  for (const scannedId of scannedIds) {
    const trimmed = scannedId.trim();
    if (!trimmed) continue;
    if (systemIds.has(trimmed)) continue; // ya procesado arriba

    // Buscar en todo el dataset
    const found = data.find((r) => r.shipmentId === trimmed);

    if (found && !matchHuId(found.outboundId, huId)) {
      // Pertenece a otro HU → CRUZADO (sin importar sub-ca)
      const dispatched =
        (found.statusDescription || found.hubStatus || '')
          .toLowerCase()
          .includes('dispatch') ||
        (found.hubStatus || '').toLowerCase().includes('dispatch');

      results.push({
        shipmentId: trimmed,
        status: 'crossed',
        subca: found.labelingZone || 'N/A',
        statusDescription: found.statusDescription || found.hubStatus || '',
        labelingLastPrintUser: found.labelingLastPrintUser || '',
        labelingAuthorizationDate: found.labelingAuthorizationDate || '',
        outboundUserIds: found.outboundUserIds || '',
        dispatched,
        crossedFromHu: found.outboundId,
      });
    } else {
      // No encontrado en ningún HU del dataset → SIN MANIFESTAR
      results.push({
        shipmentId: trimmed,
        status: 'unmanifested',
        subca: 'N/A',
        statusDescription: '',
        labelingLastPrintUser: '',
        labelingAuthorizationDate: '',
        outboundUserIds: '',
        dispatched: false,
      });
    }
  }

  // HUs de sub-ca encontrados (HUs origen de cruzados)
  const crossedHusSet = new Set<string>();
  for (const r of results) {
    if (r.status === 'crossed' && r.crossedFromHu) {
      crossedHusSet.add(r.crossedFromHu);
    }
  }

  const totalOk = results.filter((r) => r.status === 'ok').length;
  const totalMissing = results.filter((r) => r.status === 'missing').length;
  const totalSurplus = results.filter((r) => r.status === 'surplus').length;
  const totalCrossed = results.filter((r) => r.status === 'crossed').length;
  const totalUnmanifested = results.filter((r) => r.status === 'unmanifested').length;

  return {
    huId,
    date,
    shift,
    subca: mainSubca,
    observations,
    systemShipments: systemRows.map((r) => r.shipmentId),
    scannedShipments: scannedIds,
    results,
    totalSystem: systemRows.length,
    totalScanned: scannedIds.length,
    totalOk,
    totalMissing,
    totalSurplus,
    totalCrossed,
    totalUnmanifested,
    assemblyUsers: [...assemblyUsersSet],
    crossedHus: [...crossedHusSet],
  };
}

/**
 * Calcula estadísticas diarias para el dashboard.
 */
export function computeDailyStats(audits: AuditResult[]) {
  const byDate = new Map<string, AuditResult[]>();
  for (const a of audits) {
    const list = byDate.get(a.date) ?? [];
    list.push(a);
    byDate.set(a.date, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const totalHusAudited = list.length;
      const husWithDeviation = list.filter(
        (a) => a.totalMissing > 0 || a.totalCrossed > 0 || a.totalUnmanifested > 0
      ).length;
      const totalShipmentsAudited = list.reduce((s, a) => s + a.totalSystem, 0);
      const totalMissing = list.reduce((s, a) => s + a.totalMissing, 0);
      const totalCrossed = list.reduce((s, a) => s + a.totalCrossed, 0);
      const totalUnmanifested = list.reduce((s, a) => s + a.totalUnmanifested, 0);
      const totalWithErrors = totalMissing + totalCrossed + totalUnmanifested;
      return {
        date,
        totalHusAudited,
        husWithDeviation,
        percentHusWithDeviation:
          totalHusAudited > 0
            ? Math.round((husWithDeviation / totalHusAudited) * 10000) / 100
            : 0,
        totalShipmentsAudited,
        totalMissing,
        totalCrossed,
        totalUnmanifested,
        totalDamaged: 0,
        percentWithErrors:
          totalShipmentsAudited > 0
            ? Math.round((totalWithErrors / totalShipmentsAudited) * 10000) / 100
            : 0,
      };
    });
}

/**
 * Estadísticas por sub-ca.
 */
export function computeSubcaStats(audits: AuditResult[]) {
  const bySubca = new Map<string, AuditResult[]>();
  for (const a of audits) {
    const list = bySubca.get(a.subca) ?? [];
    list.push(a);
    bySubca.set(a.subca, list);
  }

  return [...bySubca.entries()].map(([subca, list]) => ({
    subca,
    husAuditados: list.length,
    totalShipments: list.reduce((s, a) => s + a.totalSystem, 0),
    totalMissing: list.reduce((s, a) => s + a.totalMissing, 0),
    totalCrossed: list.reduce((s, a) => s + a.totalCrossed, 0),
    totalUnmanifested: list.reduce((s, a) => s + a.totalUnmanifested, 0),
    totalOk: list.reduce((s, a) => s + a.totalOk, 0),
  }));
}

/**
 * Estadísticas por usuario de armado.
 */
export function computeUserStats(audits: AuditResult[]) {
  const byUser = new Map<
    string,
    { hus: number; shipments: number; errors: number }
  >();
  for (const a of audits) {
    for (const user of a.assemblyUsers) {
      const s = byUser.get(user) ?? { hus: 0, shipments: 0, errors: 0 };
      s.hus += 1;
      s.shipments += a.totalSystem;
      s.errors += a.totalMissing + a.totalCrossed + a.totalUnmanifested;
      byUser.set(user, s);
    }
  }
  return [...byUser.entries()].map(([userId, s]) => ({
    userId,
    totalHus: s.hus,
    totalShipments: s.shipments,
    totalErrors: s.errors,
    errorRate:
      s.shipments > 0
        ? Math.round((s.errors / s.shipments) * 10000) / 100
        : 0,
  }));
}
