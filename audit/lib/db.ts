import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// La DB se guarda en la raíz del proyecto como audit.db
// En producción podés cambiar la ruta via DB_PATH env var
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'audit.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // WAL mode = mejor performance en lecturas concurrentes
  _db.pragma('journal_mode = WAL');

  // ── Migraciones inline ────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      hu_id             TEXT    NOT NULL,
      date              TEXT    NOT NULL,
      shift             TEXT    NOT NULL,
      subca             TEXT    NOT NULL DEFAULT '',
      observations      TEXT    NOT NULL DEFAULT '',
      total_system      INTEGER NOT NULL DEFAULT 0,
      total_scanned     INTEGER NOT NULL DEFAULT 0,
      total_ok          INTEGER NOT NULL DEFAULT 0,
      total_missing     INTEGER NOT NULL DEFAULT 0,
      total_crossed     INTEGER NOT NULL DEFAULT 0,
      total_unmanifested INTEGER NOT NULL DEFAULT 0,
      assembly_users    TEXT    NOT NULL DEFAULT '[]',
      crossed_hus       TEXT    NOT NULL DEFAULT '[]',
      system_shipments  TEXT    NOT NULL DEFAULT '[]',
      scanned_shipments TEXT    NOT NULL DEFAULT '[]',
      results           TEXT    NOT NULL DEFAULT '[]',
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Índices para las consultas más frecuentes
    CREATE INDEX IF NOT EXISTS idx_audits_date  ON audits(date);
    CREATE INDEX IF NOT EXISTS idx_audits_hu_id ON audits(hu_id);
  `);

  return _db;
}
