import { Router, Request, Response, NextFunction } from 'express';
import { SaveAuditUseCase } from '../application/SaveAuditUseCase';
import { GetAllAuditsUseCase } from '../application/GetAllAuditsUseCase';
import { GetAuditByIdUseCase } from '../application/GetAuditByIdUseCase';
import { DeleteAuditUseCase } from '../application/DeleteAuditUseCase';
import { GetStatsUseCase } from '../application/GetStatsUseCase';
import { AuditRepository } from '../domain/AuditRepository';

export function createAuditRouter(repo: AuditRepository): Router {
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
      });

      res.status(201).json({ success: true, data: audit });
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
