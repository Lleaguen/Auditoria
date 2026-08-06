import { Pool } from 'pg';
import { getPool } from './client';

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      nombre        TEXT    NOT NULL,
      apellido      TEXT    NOT NULL,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'auditor' CHECK(role IN ('admin','auditor')),
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audits (
      id                 SERIAL PRIMARY KEY,
      hu_id              TEXT    NOT NULL,
      date               TEXT    NOT NULL,
      shift              TEXT    NOT NULL DEFAULT '',
      subca              TEXT    NOT NULL DEFAULT '',
      observations       TEXT    NOT NULL DEFAULT '',
      total_system       INTEGER NOT NULL DEFAULT 0,
      total_scanned      INTEGER NOT NULL DEFAULT 0,
      total_ok           INTEGER NOT NULL DEFAULT 0,
      total_missing      INTEGER NOT NULL DEFAULT 0,
      total_surplus      INTEGER NOT NULL DEFAULT 0,
      total_crossed      INTEGER NOT NULL DEFAULT 0,
      total_unmanifested INTEGER NOT NULL DEFAULT 0,
      assembly_users     JSONB   NOT NULL DEFAULT '[]',
      crossed_hus        JSONB   NOT NULL DEFAULT '[]',
      system_shipments   JSONB   NOT NULL DEFAULT '[]',
      scanned_shipments  JSONB   NOT NULL DEFAULT '[]',
      created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(hu_id, date)
    );

    CREATE TABLE IF NOT EXISTS audit_shipment_results (
      id                          SERIAL PRIMARY KEY,
      audit_id                    INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      shipment_id                 TEXT    NOT NULL,
      status                      TEXT    NOT NULL,
      subca                       TEXT    NOT NULL DEFAULT '',
      status_description          TEXT    NOT NULL DEFAULT '',
      labeling_last_print_user    TEXT    NOT NULL DEFAULT '',
      labeling_authorization_date TEXT    NOT NULL DEFAULT '',
      outbound_user_ids           TEXT    NOT NULL DEFAULT '',
      dispatched                  BOOLEAN NOT NULL DEFAULT FALSE,
      crossed_from_hu             TEXT
    );

    -- Migraciones no destructivas para DBs existentes
    ALTER TABLE audits ADD COLUMN IF NOT EXISTS observations        TEXT    NOT NULL DEFAULT '';
    ALTER TABLE audits ADD COLUMN IF NOT EXISTS total_surplus       INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE audits ADD COLUMN IF NOT EXISTS total_unmanifested  INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE audits ADD COLUMN IF NOT EXISTS created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL;

    ALTER TABLE audit_shipment_results DROP CONSTRAINT IF EXISTS audit_shipment_results_status_check;
    ALTER TABLE audit_shipment_results ADD CONSTRAINT  audit_shipment_results_status_check
      CHECK(status IN ('ok','missing','surplus','crossed','unmanifested'));

    CREATE INDEX IF NOT EXISTS idx_audits_date       ON audits(date);
    CREATE INDEX IF NOT EXISTS idx_audits_hu_id      ON audits(hu_id);
    CREATE INDEX IF NOT EXISTS idx_audits_shift      ON audits(shift);
    CREATE INDEX IF NOT EXISTS idx_audits_created_by ON audits(created_by);
    CREATE INDEX IF NOT EXISTS idx_results_audit     ON audit_shipment_results(audit_id);
    CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username);

    -- Tabla de planes de auditoría diarios
    CREATE TABLE IF NOT EXISTS audit_plans (
      id         SERIAL PRIMARY KEY,
      date       TEXT NOT NULL,
      shift      TEXT NOT NULL DEFAULT '',
      items      JSONB NOT NULL DEFAULT '[]',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(date, shift)
    );

    CREATE INDEX IF NOT EXISTS idx_plans_date ON audit_plans(date);

    -- ── Post-Audit: verificación post-corrección ──────────────────────────────
    CREATE TABLE IF NOT EXISTS post_audits (
      id          SERIAL PRIMARY KEY,
      audit_id    INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      post_date   TEXT    NOT NULL,
      csv_filename TEXT   NOT NULL DEFAULT '',
      created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      -- Totales de corrección
      total_errors_found     INTEGER NOT NULL DEFAULT 0,
      total_errors_corrected INTEGER NOT NULL DEFAULT 0,
      UNIQUE(audit_id)  -- un solo post-audit por auditoría
    );

    CREATE TABLE IF NOT EXISTS post_audit_results (
      id            SERIAL PRIMARY KEY,
      post_audit_id INTEGER NOT NULL REFERENCES post_audits(id) ON DELETE CASCADE,
      shipment_id   TEXT    NOT NULL,
      -- Estado en cada etapa
      status_pre    TEXT    NOT NULL DEFAULT '',  -- estado en el CSV original (PRE)
      status_audit  TEXT    NOT NULL DEFAULT '',  -- estado detectado en la auditoría (AUDIT)
      status_post   TEXT    NOT NULL DEFAULT '',  -- estado en el CSV post (POST)
      -- Datos de contexto
      hu_pre        TEXT    NOT NULL DEFAULT '',  -- outboundId en CSV pre
      hu_post       TEXT    NOT NULL DEFAULT '',  -- outboundId en CSV post (puede ser diferente si fue corregido)
      subca         TEXT    NOT NULL DEFAULT '',
      corrected     BOOLEAN NOT NULL DEFAULT FALSE,
      correction_note TEXT  NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_post_audits_audit_id   ON post_audits(audit_id);
    CREATE INDEX IF NOT EXISTS idx_post_results_post_id   ON post_audit_results(post_audit_id);
    CREATE INDEX IF NOT EXISTS idx_post_audits_created_by ON post_audits(created_by);
  `);

  await seedAdminUser(pool);

  console.log('[DB] Migraciones aplicadas correctamente');
}

async function seedAdminUser(pool: Pool): Promise<void> {
  const { rows } = await pool.query('SELECT id FROM users LIMIT 1');
  if (rows.length > 0) return; // ya hay usuarios, no tocar

  const bcrypt = await import('bcrypt');
  const hash   = await bcrypt.hash('admin123', 12);

  await pool.query(
    `INSERT INTO users (nombre, apellido, username, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)`,
    ['Admin', 'Sistema', 'admin', hash, 'admin']
  );

  console.log('[DB] Admin inicial creado → username: admin  password: admin123');
}
