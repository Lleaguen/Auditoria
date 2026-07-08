import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireAdmin } from '../../shared/middleware/auth';

export interface PlanItem {
  subca: string;
  targetHus: number;
  assignedAuditor: string; // username o nombre libre
}

export interface AuditPlan {
  id?: number;
  date: string;
  shift: string;
  items: PlanItem[];
  createdBy?: number;
  createdAt?: string;
}

export function createPlanRouter(pool: Pool): Router {
  const router = Router();

  // ── GET /api/plans?date=&shift= ───────────────────────────────────────────
  router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, shift } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (date)  { conditions.push(`date = $${idx++}`);  params.push(date); }
      if (shift) { conditions.push(`shift = $${idx++}`); params.push(shift); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT * FROM audit_plans ${where} ORDER BY date DESC, shift ASC`,
        params
      );

      const plans: AuditPlan[] = rows.map((r) => ({
        id:        r.id,
        date:      r.date,
        shift:     r.shift,
        items:     Array.isArray(r.items) ? r.items : [],
        createdBy: r.created_by,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      }));

      res.json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /api/plans — crear o reemplazar plan (upsert) — solo admin ───────
  router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, shift, items } = req.body as AuditPlan;

      if (!date || !Array.isArray(items)) {
        res.status(400).json({ success: false, error: 'date e items son requeridos' });
        return;
      }

      const { rows } = await pool.query(
        `INSERT INTO audit_plans (date, shift, items, created_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (date, shift) DO UPDATE SET
           items      = EXCLUDED.items,
           created_by = EXCLUDED.created_by
         RETURNING *`,
        [date, shift ?? '', JSON.stringify(items), req.user?.userId ?? null]
      );

      const plan: AuditPlan = {
        id:        rows[0].id,
        date:      rows[0].date,
        shift:     rows[0].shift,
        items:     rows[0].items,
        createdBy: rows[0].created_by,
        createdAt: rows[0].created_at instanceof Date
          ? rows[0].created_at.toISOString()
          : String(rows[0].created_at),
      };

      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE /api/plans/:id — solo admin ────────────────────────────────────
  router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { rowCount } = await pool.query('DELETE FROM audit_plans WHERE id = $1', [id]);
      if ((rowCount ?? 0) === 0) {
        res.status(404).json({ success: false, error: 'Plan no encontrado' });
        return;
      }
      res.json({ success: true, message: 'Plan eliminado' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
