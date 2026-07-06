import { Pool, PoolClient } from 'pg';
import { Audit, ScannedShipmentResult } from '../domain/Audit';
import { AuditRepository, AuditFilters } from '../domain/AuditRepository';

// ── Tipos de filas DB ────────────────────────────────────────────────────────

interface AuditRow {
  id: number;
  hu_id: string;
  date: string;
  shift: string;
  subca: string;
  observations: string;
  total_system: number;
  total_scanned: number;
  total_ok: number;
  total_missing: number;
  total_surplus: number;
  total_crossed: number;
  total_unmanifested: number;
  assembly_users: string[];
  crossed_hus: string[];
  system_shipments: string[];
  scanned_shipments: string[];
  created_at: Date;
}

interface ShipmentResultRow {
  id: number;
  audit_id: number;
  shipment_id: string;
  status: string;
  subca: string;
  status_description: string;
  labeling_last_print_user: string;
  labeling_authorization_date: string;
  outbound_user_ids: string;
  dispatched: boolean;
  crossed_from_hu: string | null;
}

// ── Adaptador Postgres ───────────────────────────────────────────────────────

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly pool: Pool) {}

  // ── Mappers ──────────────────────────────────────────────────────────────

  private rowToAudit(row: AuditRow, results: ScannedShipmentResult[]): Audit {
    return {
      id:                row.id,
      huId:              row.hu_id,
      date:              row.date,
      shift:             row.shift as Audit['shift'],
      subca:             row.subca,
      observations:      row.observations ?? '',
      totalSystem:       Number(row.total_system),
      totalScanned:      Number(row.total_scanned),
      totalOk:           Number(row.total_ok),
      totalMissing:      Number(row.total_missing),
      totalSurplus:      Number(row.total_surplus),
      totalCrossed:      Number(row.total_crossed),
      totalUnmanifested: Number(row.total_unmanifested ?? 0),
      assemblyUsers:    Array.isArray(row.assembly_users)    ? row.assembly_users    : [],
      crossedHus:       Array.isArray(row.crossed_hus)       ? row.crossed_hus       : [],
      systemShipments:  Array.isArray(row.system_shipments)  ? row.system_shipments  : [],
      scannedShipments: Array.isArray(row.scanned_shipments) ? row.scanned_shipments : [],
      results,
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    };
  }

  private shipmentRowToResult(row: ShipmentResultRow): ScannedShipmentResult {
    return {
      shipmentId:                 row.shipment_id,
      status:                     row.status as ScannedShipmentResult['status'],
      subca:                      row.subca,
      statusDescription:          row.status_description,
      labelingLastPrintUser:      row.labeling_last_print_user,
      labelingAuthorizationDate:  row.labeling_authorization_date,
      outboundUserIds:            row.outbound_user_ids,
      dispatched:                 row.dispatched,
      crossedFromHu:              row.crossed_from_hu ?? undefined,
    };
  }

  // ── Carga resultados de shipments para múltiples audits ──────────────────

  private async loadResultsForAudits(
    client: PoolClient,
    auditIds: number[]
  ): Promise<Map<number, ScannedShipmentResult[]>> {
    if (auditIds.length === 0) return new Map();

    const placeholders = auditIds.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await client.query<ShipmentResultRow>(
      `SELECT * FROM audit_shipment_results
       WHERE audit_id IN (${placeholders})
       ORDER BY id ASC`,
      auditIds
    );

    const map = new Map<number, ScannedShipmentResult[]>();
    for (const row of rows) {
      const list = map.get(row.audit_id) ?? [];
      list.push(this.shipmentRowToResult(row));
      map.set(row.audit_id, list);
    }
    return map;
  }

  // ── Implementación del puerto ────────────────────────────────────────────

  async save(audit: Audit): Promise<Audit> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert: si ya existe el mismo hu_id + date, actualiza todo
      const upsertResult = await client.query<{ id: number }>(
        `INSERT INTO audits (
          hu_id, date, shift, subca, observations,
          total_system, total_scanned, total_ok, total_missing, total_surplus, total_crossed, total_unmanifested,
          assembly_users, crossed_hus, system_shipments, scanned_shipments
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (hu_id, date) DO UPDATE SET
          shift              = EXCLUDED.shift,
          subca              = EXCLUDED.subca,
          observations       = EXCLUDED.observations,
          total_system       = EXCLUDED.total_system,
          total_scanned      = EXCLUDED.total_scanned,
          total_ok           = EXCLUDED.total_ok,
          total_missing      = EXCLUDED.total_missing,
          total_surplus      = EXCLUDED.total_surplus,
          total_crossed      = EXCLUDED.total_crossed,
          total_unmanifested = EXCLUDED.total_unmanifested,
          assembly_users     = EXCLUDED.assembly_users,
          crossed_hus        = EXCLUDED.crossed_hus,
          system_shipments   = EXCLUDED.system_shipments,
          scanned_shipments  = EXCLUDED.scanned_shipments
        RETURNING id`,
        [
          audit.huId,
          audit.date,
          audit.shift,
          audit.subca,
          audit.observations ?? '',
          audit.totalSystem,
          audit.totalScanned,
          audit.totalOk,
          audit.totalMissing,
          audit.totalSurplus ?? 0,
          audit.totalCrossed,
          audit.totalUnmanifested ?? 0,
          JSON.stringify(audit.assemblyUsers),
          JSON.stringify(audit.crossedHus),
          JSON.stringify(audit.systemShipments),
          JSON.stringify(audit.scannedShipments),
        ]
      );

      const auditId = upsertResult.rows[0].id;

      // Elimina resultados anteriores y reinserta (por si fue upsert)
      await client.query(
        'DELETE FROM audit_shipment_results WHERE audit_id = $1',
        [auditId]
      );

      if (audit.results.length > 0) {
        // Inserción en batch para performance
        const values: unknown[] = [];
        const placeholderGroups: string[] = [];

        audit.results.forEach((r, i) => {
          const base = i * 10;
          placeholderGroups.push(
            `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10})`
          );
          values.push(
            auditId,
            r.shipmentId,
            r.status,
            r.subca,
            r.statusDescription,
            r.labelingLastPrintUser,
            r.labelingAuthorizationDate,
            r.outboundUserIds,
            r.dispatched,
            r.crossedFromHu ?? null
          );
        });

        await client.query(
          `INSERT INTO audit_shipment_results (
            audit_id, shipment_id, status, subca, status_description,
            labeling_last_print_user, labeling_authorization_date,
            outbound_user_ids, dispatched, crossed_from_hu
          ) VALUES ${placeholderGroups.join(', ')}`,
          values
        );
      }

      await client.query('COMMIT');

      // Retorna la entidad guardada completa
      const saved = await this.findById(auditId);
      return saved!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findAll(filters?: AuditFilters): Promise<Audit[]> {
    const client = await this.pool.connect();
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (filters?.date)     { conditions.push(`date = $${idx++}`);     params.push(filters.date); }
      if (filters?.shift)    { conditions.push(`shift = $${idx++}`);    params.push(filters.shift); }
      if (filters?.subca)    { conditions.push(`subca = $${idx++}`);    params.push(filters.subca); }
      if (filters?.fromDate) { conditions.push(`date >= $${idx++}`);    params.push(filters.fromDate); }
      if (filters?.toDate)   { conditions.push(`date <= $${idx++}`);    params.push(filters.toDate); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await client.query<AuditRow>(
        `SELECT * FROM audits ${where} ORDER BY created_at DESC`,
        params
      );

      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      const resultsMap = await this.loadResultsForAudits(client, ids);

      return rows.map((row) =>
        this.rowToAudit(row, resultsMap.get(row.id) ?? [])
      );
    } finally {
      client.release();
    }
  }

  async findById(id: number): Promise<Audit | null> {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<AuditRow>(
        'SELECT * FROM audits WHERE id = $1',
        [id]
      );
      if (rows.length === 0) return null;

      const { rows: resultRows } = await client.query<ShipmentResultRow>(
        'SELECT * FROM audit_shipment_results WHERE audit_id = $1 ORDER BY id ASC',
        [id]
      );

      return this.rowToAudit(rows[0], resultRows.map((r) => this.shipmentRowToResult(r)));
    } finally {
      client.release();
    }
  }

  async findByHuAndDate(huId: string, date: string): Promise<Audit | null> {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<{ id: number }>(
        'SELECT id FROM audits WHERE hu_id = $1 AND date = $2',
        [huId, date]
      );
      if (rows.length === 0) return null;
      return this.findById(rows[0].id);
    } finally {
      client.release();
    }
  }

  async delete(id: number): Promise<boolean> {
    // ON DELETE CASCADE elimina audit_shipment_results automáticamente
    const { rowCount } = await this.pool.query(
      'DELETE FROM audits WHERE id = $1',
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  async count(filters?: AuditFilters): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters?.date)     { conditions.push(`date = $${idx++}`);     params.push(filters.date); }
    if (filters?.shift)    { conditions.push(`shift = $${idx++}`);    params.push(filters.shift); }
    if (filters?.subca)    { conditions.push(`subca = $${idx++}`);    params.push(filters.subca); }
    if (filters?.fromDate) { conditions.push(`date >= $${idx++}`);    params.push(filters.fromDate); }
    if (filters?.toDate)   { conditions.push(`date <= $${idx++}`);    params.push(filters.toDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM audits ${where}`,
      params
    );
    return parseInt(rows[0].total, 10);
  }
}
