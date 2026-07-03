-- ============================================================
-- Script de inicialización de la base de datos local
-- Base de datos: audit_db
-- ============================================================

-- Crear la base de datos (ejecutar conectado a "postgres" primero)
-- CREATE DATABASE audit_db;

-- ── Tabla principal de auditorías ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id                SERIAL        PRIMARY KEY,
  hu_id             VARCHAR(100)  NOT NULL,
  date              DATE          NOT NULL,
  shift             VARCHAR(5)    NOT NULL DEFAULT '',
  subca             VARCHAR(100)  NOT NULL DEFAULT '',
  total_system      INTEGER       NOT NULL DEFAULT 0,
  total_scanned     INTEGER       NOT NULL DEFAULT 0,
  total_ok          INTEGER       NOT NULL DEFAULT 0,
  total_missing     INTEGER       NOT NULL DEFAULT 0,
  total_surplus     INTEGER       NOT NULL DEFAULT 0,
  total_crossed     INTEGER       NOT NULL DEFAULT 0,
  assembly_users    JSONB         NOT NULL DEFAULT '[]',
  crossed_hus       JSONB         NOT NULL DEFAULT '[]',
  system_shipments  JSONB         NOT NULL DEFAULT '[]',
  scanned_shipments JSONB         NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Evita duplicados: misma HU en el mismo día
  CONSTRAINT audits_hu_date_unique UNIQUE (hu_id, date)
);

-- ── Tabla de resultados por envío ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_shipment_results (
  id                            SERIAL        PRIMARY KEY,
  audit_id                      INTEGER       NOT NULL
    REFERENCES audits(id) ON DELETE CASCADE,
  shipment_id                   VARCHAR(100)  NOT NULL,
  status                        VARCHAR(20)   NOT NULL,  -- ok | missing | surplus | crossed
  subca                         VARCHAR(100)  NOT NULL DEFAULT '',
  status_description            TEXT          NOT NULL DEFAULT '',
  labeling_last_print_user      VARCHAR(100)  NOT NULL DEFAULT '',
  labeling_authorization_date   VARCHAR(100)  NOT NULL DEFAULT '',
  outbound_user_ids             TEXT          NOT NULL DEFAULT '',
  dispatched                    BOOLEAN       NOT NULL DEFAULT FALSE,
  crossed_from_hu               VARCHAR(100)  NULL
);

-- ── Índices para consultas frecuentes ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audits_date       ON audits(date);
CREATE INDEX IF NOT EXISTS idx_audits_shift      ON audits(shift);
CREATE INDEX IF NOT EXISTS idx_audits_subca      ON audits(subca);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_audit_id ON audit_shipment_results(audit_id);

-- ============================================================
-- Verificación
-- ============================================================
SELECT 'Tabla audits creada correctamente' AS status
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'audits'
);

SELECT 'Tabla audit_shipment_results creada correctamente' AS status
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'audit_shipment_results'
);
