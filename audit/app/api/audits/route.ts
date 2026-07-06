import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { AuditResult } from '@/lib/types';

// ── GET /api/audits ──────────────────────────────────────────────────────────
// Query params opcionales: date, shift, subca, fromDate, toDate

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = req.nextUrl;

    let sql = 'SELECT * FROM audits WHERE 1=1';
    const params: (string | number)[] = [];

    if (searchParams.get('date')) {
      sql += ' AND date = ?';
      params.push(searchParams.get('date')!);
    }
    if (searchParams.get('shift')) {
      sql += ' AND shift = ?';
      params.push(searchParams.get('shift')!);
    }
    if (searchParams.get('subca')) {
      sql += ' AND subca = ?';
      params.push(searchParams.get('subca')!);
    }
    if (searchParams.get('fromDate')) {
      sql += ' AND date >= ?';
      params.push(searchParams.get('fromDate')!);
    }
    if (searchParams.get('toDate')) {
      sql += ' AND date <= ?';
      params.push(searchParams.get('toDate')!);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params) as DbAuditRow[];
    const audits = rows.map(rowToAudit);

    return NextResponse.json({ success: true, data: audits, total: audits.length });
  } catch (err) {
    console.error('[GET /api/audits]', err);
    return NextResponse.json(
      { success: false, error: 'Error al leer auditorías' },
      { status: 500 }
    );
  }
}

// ── POST /api/audits ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = (await req.json()) as AuditResult;

    // Upsert: si ya existe el mismo HU + fecha, actualiza
    const existing = db
      .prepare('SELECT id FROM audits WHERE hu_id = ? AND date = ?')
      .get(body.huId, body.date) as { id: number } | undefined;

    if (existing) {
      // Actualizar
      db.prepare(`
        UPDATE audits SET
          shift              = ?,
          subca              = ?,
          observations       = ?,
          total_system       = ?,
          total_scanned      = ?,
          total_ok           = ?,
          total_missing      = ?,
          total_crossed      = ?,
          total_unmanifested = ?,
          assembly_users     = ?,
          crossed_hus        = ?,
          system_shipments   = ?,
          scanned_shipments  = ?,
          results            = ?,
          created_at         = datetime('now')
        WHERE id = ?
      `).run(
        body.shift,
        body.subca,
        body.observations ?? '',
        body.totalSystem,
        body.totalScanned,
        body.totalOk,
        body.totalMissing,
        body.totalCrossed      ?? 0,
        body.totalUnmanifested ?? 0,
        JSON.stringify(body.assemblyUsers   ?? []),
        JSON.stringify(body.crossedHus      ?? []),
        JSON.stringify(body.systemShipments ?? []),
        JSON.stringify(body.scannedShipments ?? []),
        JSON.stringify(body.results         ?? []),
        existing.id,
      );

      const updated = db
        .prepare('SELECT * FROM audits WHERE id = ?')
        .get(existing.id) as DbAuditRow;
      return NextResponse.json({ success: true, data: rowToAudit(updated) });
    }

    // Insertar nuevo
    const info = db.prepare(`
      INSERT INTO audits (
        hu_id, date, shift, subca, observations,
        total_system, total_scanned, total_ok, total_missing,
        total_crossed, total_unmanifested,
        assembly_users, crossed_hus, system_shipments, scanned_shipments, results
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.huId,
      body.date,
      body.shift,
      body.subca,
      body.observations ?? '',
      body.totalSystem,
      body.totalScanned,
      body.totalOk,
      body.totalMissing,
      body.totalCrossed      ?? 0,
      body.totalUnmanifested ?? 0,
      JSON.stringify(body.assemblyUsers    ?? []),
      JSON.stringify(body.crossedHus       ?? []),
      JSON.stringify(body.systemShipments  ?? []),
      JSON.stringify(body.scannedShipments ?? []),
      JSON.stringify(body.results          ?? []),
    );

    const inserted = db
      .prepare('SELECT * FROM audits WHERE id = ?')
      .get(info.lastInsertRowid) as DbAuditRow;

    return NextResponse.json(
      { success: true, data: rowToAudit(inserted) },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/audits]', err);
    return NextResponse.json(
      { success: false, error: 'Error al guardar auditoría' },
      { status: 500 }
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface DbAuditRow {
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
  total_crossed: number;
  total_unmanifested: number;
  assembly_users: string;
  crossed_hus: string;
  system_shipments: string;
  scanned_shipments: string;
  results: string;
  created_at: string;
}

function rowToAudit(row: DbAuditRow): AuditResult {
  return {
    id:                 row.id,
    huId:               row.hu_id,
    date:               row.date,
    shift:              row.shift,
    subca:              row.subca,
    observations:       row.observations,
    totalSystem:        row.total_system,
    totalScanned:       row.total_scanned,
    totalOk:            row.total_ok,
    totalMissing:       row.total_missing,
    totalCrossed:       row.total_crossed      ?? 0,
    totalUnmanifested:  row.total_unmanifested ?? 0,
    assemblyUsers:      safeParseJson(row.assembly_users,    []),
    crossedHus:         safeParseJson(row.crossed_hus,       []),
    systemShipments:    safeParseJson(row.system_shipments,  []),
    scannedShipments:   safeParseJson(row.scanned_shipments, []),
    results:            safeParseJson(row.results,           []),
  };
}

function safeParseJson<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T; } catch { return fallback; }
}
