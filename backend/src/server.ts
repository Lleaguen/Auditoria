import 'dotenv/config';
import express from 'express';
import { corsMiddleware } from './shared/middleware/cors';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler';
import { requireAuth } from './shared/middleware/auth';
import { getPool, closePool } from './shared/db/client';
import { runMigrations } from './shared/db/schema';
import { PostgresAuditRepository } from './modules/audits/infrastructure/PostgresAuditRepository';
import { createAuditRouter } from './modules/audits/infrastructure/AuditHttpRouter';
import { PostgresUserRepository } from './modules/users/infrastructure/PostgresUserRepository';
import { createUserRouter } from './modules/users/infrastructure/UserHttpRouter';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function bootstrap() {
  const pool = getPool();
  await runMigrations();

  // Repositorios
  const auditRepo = new PostgresAuditRepository(pool);
  const userRepo  = new PostgresUserRepository(pool);

  // App Express
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check (público)
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  // Auth (login público, gestión de usuarios protegida por rol)
  app.use('/api/auth', createUserRouter(userRepo));

  // Audits — requiere token válido
  app.use('/api/audits', requireAuth, createAuditRouter(auditRepo));

  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor en http://0.0.0.0:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   Login:   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   Audits:  http://localhost:${PORT}/api/audits\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} — cerrando...`);
    server.close(async () => { await closePool(); process.exit(0); });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
