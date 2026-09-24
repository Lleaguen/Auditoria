import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Singleton: un pool de conexiones para toda la vida del proceso
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    // Neon (y otros proveedores) proveen una DATABASE_URL completa.
    // Si está disponible la usamos directamente; si no, caemos a las variables individuales.
    const connectionString = process.env.DATABASE_URL;

    pool = new Pool(
      connectionString
        ? {
            connectionString,
            // Neon requiere SSL en producción
            ssl: process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
          }
        : {
            host:     process.env.DB_HOST     ?? 'localhost',
            port:     parseInt(process.env.DB_PORT ?? '5432', 10),
            database: process.env.DB_NAME     ?? 'audit_db',
            user:     process.env.DB_USER     ?? 'postgres',
            password: process.env.DB_PASSWORD ?? '',
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
          }
    );

    pool.on('error', (err) => {
      console.error('[DB] Error inesperado en el pool:', err.message);
    });

    console.log(
      connectionString
        ? '[DB] Pool de PostgreSQL iniciado → DATABASE_URL (Neon)'
        : `[DB] Pool de PostgreSQL iniciado → ${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'audit_db'}`
    );
  }

  return pool;
}

/** Cierra el pool limpiamente al apagar el servidor */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Pool cerrado');
  }
}
