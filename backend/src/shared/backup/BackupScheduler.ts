import cron from 'node-cron';
import { Pool } from 'pg';
import { runDailyBackup } from './BackupService';

/**
 * Registra el job de backup automático diario.
 * Corre todos los días a las 10:00 AM (hora del servidor).
 *
 * Expresión cron: '0 10 * * *'
 *   - 0  → minuto 0
 *   - 10 → hora 10
 *   - *  → cualquier día del mes
 *   - *  → cualquier mes
 *   - *  → cualquier día de la semana
 */
export function registerBackupScheduler(pool: Pool): void {
  const expression = process.env.BACKUP_CRON ?? '0 10 * * *';

  if (!cron.validate(expression)) {
    console.error(`[Backup] Expresión cron inválida: "${expression}". El scheduler no se registró.`);
    return;
  }

  cron.schedule(expression, async () => {
    try {
      await runDailyBackup(pool);
    } catch (err) {
      console.error('[Backup] Error durante el backup automático:', err);
    }
  });

  console.log(`[Backup] Scheduler registrado — se ejecuta según: "${expression}"`);
}
