import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Singleton: un pool de conexiones para toda la vida del proceso
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host:     process.env.DB_HOST     ?? 'localhost',
      port:     parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME     ?? 'audit_db',
      user:     process.env.DB_USER     ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      // Máximo de conexiones en el pool
      max: 10,
      // Tiempo máximo de inactividad antes de cerrar una conexión (ms)
      idleTimeoutMillis: 30_000,
      // Tiempo máximo esperando una conexión del pool (ms)
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Error inesperado en el pool:', err.message);
    });

    console.log(
      `[DB] Pool de PostgreSQL iniciado → ${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'audit_db'}`
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
