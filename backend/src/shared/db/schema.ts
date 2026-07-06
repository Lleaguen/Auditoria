import { getPool } from './client';

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audits (
      id                SERIAL PRIMARY KEY,
      hu_id             TEXT    NOT NULL,
      date              TEXT    NOT NULL,
      shift             TEXT    NOT NULL DEFAULT '',
      subca             TEXT    NOT NULL DEFAULT '',
      observations      TEXT    NOT NULL DEFAULT '',
      total_system      INTEGER NOT NULL DEFAULT 0,
      total_scanned     INTEGER NOT NULL DEFAULT 0,
      total_ok          INTEGER NOT NULL DEFAULT 0,
      total_missing     INTEGER NOT NULL DEFAULT 0,
      total_surplus     INTEGER NOT NULL DEFAULT 0,
      total_crossed     INTEGER NOT NULL DEFAULT 0,
      total_unmanifested INTEGER NOT NULL DEFAULT 0,
      assembly_users    JSONB   NOT NULL DEFAULT '[]',
      crossed_hus       JSONB   NOT NULL DEFAULT '[]',
      system_shipments  JSONB   NOT NULL DEFAULT '[]',
      scanned_shipments JSONB   NOT NULL DEFAULT '[]',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(hu_id, date)
    );

    CREATE TABLE IF NOT EXISTS audit_shipment_results (
      id                          SERIAL PRIMARY KEY,
      audit_id                    INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      shipment_id                 TEXT    NOT NULL,
      status                      TEXT    NOT NULL CHECK(status IN ('ok','missing','surplus','crossed','unmanifested')),
      subca                       TEXT    NOT NULL DEFAULT '',
      status_description          TEXT    NOT NULL DEFAULT '',
      labeling_last_print_user    TEXT    NOT NULL DEFAULT '',
      labeling_authorization_date TEXT    NOT NULL DEFAULT '',
      outbound_user_ids           TEXT    NOT NULL DEFAULT '',
      dispatched                  BOOLEAN NOT NULL DEFAULT FALSE,
      crossed_from_hu             TEXT
    );

    -- Columnas nuevas: agregar si no existen (migraciones no destructivas)
    ALTER TABLE audits ADD COLUMN IF NOT EXISTS observations       TEXT    NOT NULL DEFAULT '';
    ALTER TABLE audits ADD COLUMN IF NOT EXISTS total_surplus      INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE audits ADD COLUMN IF NOT EXISTS total_unmanifested INTEGER NOT NULL DEFAULT 0;

    -- Actualizar el CHECK constraint de status para incluir 'unmanifested'
    ALTER TABLE audit_shipment_results DROP CONSTRAINT IF EXISTS audit_shipment_results_status_check;
    ALTER TABLE audit_shipment_results ADD CONSTRAINT audit_shipment_results_status_check
      CHECK(status IN ('ok','missing','surplus','crossed','unmanifested'));

    CREATE INDEX IF NOT EXISTS idx_audits_date   ON audits(date);
    CREATE INDEX IF NOT EXISTS idx_audits_hu_id  ON audits(hu_id);
    CREATE INDEX IF NOT EXISTS idx_audits_shift  ON audits(shift);
    CREATE INDEX IF NOT EXISTS idx_results_audit ON audit_shipment_results(audit_id);
  `);

  console.log('[DB] Migraciones aplicadas correctamente');
}
