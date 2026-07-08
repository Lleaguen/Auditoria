import { Router, Request, Response, NextFunction } from 'express';
import { SaveAuditUseCase } from '../application/SaveAuditUseCase';
import { GetAllAuditsUseCase } from '../application/GetAllAuditsUseCase';
import { GetAuditByIdUseCase } from '../application/GetAuditByIdUseCase';
import { DeleteAuditUseCase } from '../application/DeleteAuditUseCase';
import { GetStatsUseCase } from '../application/GetStatsUseCase';
import { AuditRepository } from '../domain/AuditRepository';
import { UserRepository } from '../../users/domain/UserRepository';

export function createAuditRouter(repo: AuditRepository, userRepo: UserRepository): Router {
  const router = Router();

  // Instanciar casos de uso con el repositorio inyectado
  const saveAudit       = new SaveAuditUseCase(repo);
  const getAllAudits     = new GetAllAuditsUseCase(repo);
  const getAuditById    = new GetAuditByIdUseCase(repo);
  const deleteAudit     = new DeleteAuditUseCase(repo);
  const getStats        = new GetStatsUseCase(repo);

  // ── GET /api/audits ───────────────────────────────────────────────────────
  // Query params opcionales: date, shift, subca, fromDate, toDate
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, shift, subca, fromDate, toDate } = req.query as Record<string, string>;
      const audits = await getAllAudits.execute({
        date:     date     || undefined,
        shift:    shift    || undefined,
        subca:    subca    || undefined,
        fromDate: fromDate || undefined,
        toDate:   toDate   || undefined,
      });
      res.json({ success: true, data: audits, total: audits.length });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /api/audits/stats ─────────────────────────────────────────────────
  // Debe estar antes de /:id para que no lo capture
  router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, shift, subca, fromDate, toDate } = req.query as Record<string, string>;
      const stats = await getStats.execute({
        date:     date     || undefined,
        shift:    shift    || undefined,
        subca:    subca    || undefined,
        fromDate: fromDate || undefined,
        toDate:   toDate   || undefined,
      });
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /api/audits/:id ───────────────────────────────────────────────────
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const audit = await getAuditById.execute(id);
      res.json({ success: true, data: audit });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /api/audits ──────────────────────────────────────────────────────
  // Body: AuditResult del frontend (mismo shape)
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;

      if (!body || typeof body !== 'object') {
        res.status(400).json({ success: false, error: 'Body inválido' });
        return;
      }

      const audit = await saveAudit.execute({
        huId:              body.huId,
        date:              body.date,
        shift:             body.shift            ?? '',
        subca:             body.subca            ?? '',
        observations:      body.observations     ?? '',
        systemShipments:   body.systemShipments  ?? [],
        scannedShipments:  body.scannedShipments ?? [],
        results:           body.results          ?? [],
        totalSystem:       body.totalSystem      ?? 0,
        totalScanned:      body.totalScanned     ?? 0,
        totalOk:           body.totalOk          ?? 0,
        totalMissing:      body.totalMissing     ?? 0,
        totalSurplus:      body.totalSurplus     ?? 0,
        totalCrossed:      body.totalCrossed     ?? 0,
        totalUnmanifested: body.totalUnmanifested ?? 0,
        assemblyUsers:     body.assemblyUsers    ?? [],
        crossedHus:        body.crossedHus       ?? [],
        createdBy:         req.user?.userId,
      });

      res.status(201).json({ success: true, data: audit });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /api/audits/auditor-stats ────────────────────────────────────────
  // Stats de desempeño por auditor (usa created_by para identificar quién auditó)
  router.get('/auditor-stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, toDate } = req.query as Record<string, string>;
      const audits = await repo.findAll({
        fromDate: fromDate || undefined,
        toDate:   toDate   || undefined,
      });

      // Agrupar por created_by
      const byAuditor = new Map<number, {
        husAuditados: number;
        totalShipments: number;
        totalMissing: number;
        totalSurplus: number;
        totalCrossed: number;
        totalUnmanifested: number;
        totalOk: number;
      }>();

      for (const a of audits) {
        if (!a.createdBy) continue;
        const s = byAuditor.get(a.createdBy) ?? {
          husAuditados: 0, totalShipments: 0, totalMissing: 0,
          totalSurplus: 0, totalCrossed: 0, totalUnmanifested: 0, totalOk: 0,
        };
        s.husAuditados    += 1;
        s.totalShipments  += a.totalSystem;
        s.totalMissing    += a.totalMissing;
        s.totalSurplus    += a.totalSurplus;
        s.totalCrossed    += a.totalCrossed;
        s.totalUnmanifested += a.totalUnmanifested;
        s.totalOk         += a.totalOk;
        byAuditor.set(a.createdBy, s);
      }

      // Resolver nombres de usuario
      const allUsers = await userRepo.findAll();
      const userMap  = new Map(allUsers.map((u) => [u.id!, u]));

      const stats = [...byAuditor.entries()].map(([userId, s]) => {
        const u = userMap.get(userId);
        const errorRate = s.totalShipments > 0
          ? Math.round(((s.totalMissing + s.totalSurplus + s.totalCrossed) / s.totalShipments) * 10000) / 100
          : 0;
        return {
          userId,
          nombre:            u ? `${u.nombre} ${u.apellido}` : `Usuario #${userId}`,
          username:          u?.username ?? '',
          role:              u?.role ?? '',
          husAuditados:      s.husAuditados,
          totalShipments:    s.totalShipments,
          totalOk:           s.totalOk,
          totalMissing:      s.totalMissing,
          totalSurplus:      s.totalSurplus,
          totalCrossed:      s.totalCrossed,
          totalUnmanifested: s.totalUnmanifested,
          errorRate,
        };
      }).sort((a, b) => b.husAuditados - a.husAuditados);

      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE /api/audits/:id ────────────────────────────────────────────────
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteAudit.execute(id);
      res.json({ success: true, message: `Auditoría ${id} eliminada` });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
