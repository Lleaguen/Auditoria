import 'dotenv/config';
import express from 'express';
import { corsMiddleware } from './shared/middleware/cors';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler';
import { getPool, closePool } from './shared/db/client';
import { runMigrations } from './shared/db/schema';
import { PostgresAuditRepository } from './modules/audits/infrastructure/PostgresAuditRepository';
import { createAuditRouter } from './modules/audits/infrastructure/AuditHttpRouter';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function bootstrap() {
  // 1. Inicializar pool de PostgreSQL y correr migraciones
  const pool = getPool();
  await runMigrations();

  // 2. Crear adaptadores (infrastructure)
  const auditRepo = new PostgresAuditRepository(pool);

  // 3. Crear app Express
  const app = express();

  // 4. Middlewares globales
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 5. Health check — incluye estado de la DB
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        status: 'ok',
        db: 'connected',
        timestamp: new Date().toISOString(),
        service: 'audit-backend',
      });
    } catch {
      res.status(503).json({
        status: 'error',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 6. Rutas de módulos
  app.use('/api/audits', createAuditRouter(auditRepo));

  // 7. Manejo de errores (debe ir al final)
  app.use(notFoundHandler);
  app.use(errorHandler);

  // 8. Arrancar servidor
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Audits: http://localhost:${PORT}/api/audits`);
    console.log(`   Stats:  http://localhost:${PORT}/api/audits/stats\n`);
  });

  // 9. Cierre limpio al apagar
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} recibido, cerrando...`);
    server.close(async () => {
      await closePool();
      console.log('[Server] Cerrado correctamente');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Fatal] Error al iniciar el servidor:', err);
  process.exit(1);
});
