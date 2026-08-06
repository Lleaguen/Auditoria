import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../shared/middleware/auth';

interface PostShipment {
  shipmentId:        string;
  outboundId:        string;   // HU al que pertenece en el CSV post
  labelingZone:      string;   // Sub-CA en el CSV post
  outboundDateOpened: string;  // fecha del día del CSV
}

interface PostAuditRequest {
  auditId:        number;
  postDate:       string;
  csvFilename:    string;
  csvDate:        string;  // fecha extraída del CSV (YYYY-MM-DD)
  postShipments:  PostShipment[];
}

// ── Lógica de corrección ──────────────────────────────────────────────────────
//
// FALTANTE (missing):
//   El shipment estaba en el HU según el sistema pero no fue bipeado.
//   Corregido → el shipmentId ya NO aparece en el CSV post dentro del mismo HU
//               (fue sacado del sistema de ese HU)
//   No corregido → sigue apareciendo en el mismo HU en el CSV post
//
// SOBRANTE (surplus):
//   El shipment fue bipeado pero no estaba en el sistema del HU.
//   - Misma Sub-CA: corregido si aparece en el CSV post en el MISMO HU
//                   si aparece en OTRO HU → no corregido, nota con el HU donde está
//                   si no aparece → no corregido
//   - Distinta Sub-CA: no aplica análisis
//
// CRUZADO (crossed): → pendiente definición del usuario
//
// ─────────────────────────────────────────────────────────────────────────────

function analyzeCorrection(
  shipmentId:       string,
  auditStatus:      string,
  auditHuId:        string,
  auditSubca:       string,
  postShipmentsMap: Map<string, PostShipment>
): { corrected: boolean; statusPost: string; huPost: string; note: string } {

  const post = postShipmentsMap.get(shipmentId);

  switch (auditStatus) {

    case 'missing': {
      // Corregido si el shipment ya no está en el mismo HU en el CSV post
      if (!post || post.outboundId !== auditHuId) {
        const huPost = post?.outboundId ?? '';
        const note = huPost
          ? `Removido del HU auditado — ahora está en HU ${huPost}`
          : 'Eliminado del sistema del HU';
        return { corrected: true, statusPost: 'removed', huPost, note };
      }
      return {
        corrected:  false,
        statusPost: 'still_in_hu',
        huPost:     post.outboundId,
        note:       'Sigue en el mismo HU — no corregido',
      };
    }

    case 'surplus': {
      // Distinta Sub-CA → no aplica
      if (!post || post.labelingZone !== auditSubca) {
        return {
          corrected:  false,
          statusPost: 'different_subca',
          huPost:     post?.outboundId ?? '',
          note:       post
            ? `Sub-CA diferente (${post.labelingZone}) — no aplica análisis`
            : 'No encontrado en CSV post — Sub-CA diferente o no procesado',
        };
      }
      // Misma Sub-CA → corregido solo si está en el MISMO HU
      if (post.outboundId === auditHuId) {
        return {
          corrected:  true,
          statusPost: 'added_to_hu',
          huPost:     post.outboundId,
          note:       'Agregado al HU correctamente en el sistema',
        };
      }
      // Está en otro HU → no corregido, nota con el HU
      return {
        corrected:  false,
        statusPost: 'not_in_hu',
        huPost:     post.outboundId,
        note:       `No fue agregado al HU auditado — está en HU ${post.outboundId}`,
      };
    }

    case 'crossed': {
      // Corregido si en el CSV post tiene un outboundId diferente al HU auditado
      if (post && post.outboundId !== auditHuId) {
        return {
          corrected:  true,
          statusPost: 'moved_to_correct_hu',
          huPost:     post.outboundId,
          note:       `Movido al HU ${post.outboundId}`,
        };
      }
      if (!post) {
        return {
          corrected:  true,
          statusPost: 'not_found_post',
          huPost:     '',
          note:       'No aparece en CSV post — posiblemente corregido',
        };
      }
      return {
        corrected:  false,
        statusPost: 'still_crossed',
        huPost:     post.outboundId,
        note:       'Sigue en el HU incorrecto',
      };
    }

    default:
      return { corrected: false, statusPost: 'n/a', huPost: '', note: '' };
  }
}

// Extrae YYYY-MM-DD de un string de fecha "DD/MM/YYYY HH:mm:ss"
function parseCsvDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  // Si ya viene en formato ISO
  const iso = dateStr.substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return '';
}

export function createPostAuditRouter(pool: Pool): Router {
  const router = Router();

  // ── GET /api/post-audits/correction-stats ─────────────────────────────────
  router.get('/correction-stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, toDate } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      if (fromDate) { conditions.push(`a.date >= $${idx++}`); params.push(fromDate); }
      if (toDate)   { conditions.push(`a.date <= $${idx++}`); params.push(toDate); }
      const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      const { rows } = await pool.query(`
        SELECT
          u.id                                          AS user_id,
          u.nombre || ' ' || u.apellido                AS nombre,
          u.username,
          COUNT(DISTINCT pa.id)::int                   AS post_audits_realizados,
          SUM(pa.total_errors_found)::int              AS total_errores_encontrados,
          SUM(pa.total_errors_corrected)::int          AS total_errores_corregidos,
          CASE WHEN SUM(pa.total_errors_found) > 0
            THEN ROUND(SUM(pa.total_errors_corrected)::numeric / SUM(pa.total_errors_found) * 100, 2)
            ELSE 0
          END AS tasa_correccion
        FROM post_audits pa
        JOIN audits a ON a.id = pa.audit_id
        JOIN users  u ON u.id = a.created_by
        WHERE 1=1 ${where}
        GROUP BY u.id, u.nombre, u.apellido, u.username
        ORDER BY tasa_correccion DESC
      `, params);

      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  });

  // ── GET /api/post-audits?auditId= ─────────────────────────────────────────
  router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { auditId } = req.query as Record<string, string>;
      const conditions = auditId ? 'WHERE pa.audit_id = $1' : '';
      const params     = auditId ? [parseInt(auditId, 10)] : [];

      const { rows: paRows } = await pool.query(`
        SELECT pa.*, a.hu_id, a.date AS audit_date, a.subca AS audit_subca
        FROM post_audits pa
        JOIN audits a ON a.id = pa.audit_id
        ${conditions}
        ORDER BY pa.created_at DESC
      `, params);

      if (paRows.length === 0) { res.json({ success: true, data: [] }); return; }

      const paIds = paRows.map((r) => r.id);
      const placeholders = paIds.map((_: unknown, i: number) => `$${i + 1}`).join(', ');
      const { rows: resultRows } = await pool.query(`
        SELECT * FROM post_audit_results
        WHERE post_audit_id IN (${placeholders})
        ORDER BY post_audit_id, id
      `, paIds);

      const resultsMap = new Map<number, typeof resultRows>();
      for (const r of resultRows) {
        const list = resultsMap.get(r.post_audit_id) ?? [];
        list.push(r);
        resultsMap.set(r.post_audit_id, list);
      }

      const data = paRows.map((pa) => ({
        id: pa.id, auditId: pa.audit_id, huId: pa.hu_id,
        auditDate: pa.audit_date, auditSubca: pa.audit_subca,
        postDate: pa.post_date, csvFilename: pa.csv_filename,
        createdBy: pa.created_by, createdAt: pa.created_at,
        totalErrorsFound: pa.total_errors_found,
        totalErrorsCorrected: pa.total_errors_corrected,
        results: (resultsMap.get(pa.id) ?? []).map((r) => ({
          id: r.id, shipmentId: r.shipment_id,
          statusPre: r.status_pre, statusAudit: r.status_audit, statusPost: r.status_post,
          huPre: r.hu_pre, huPost: r.hu_post, subca: r.subca,
          corrected: r.corrected, correctionNote: r.correction_note,
        })),
      }));

      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // ── POST /api/post-audits ─────────────────────────────────────────────────
  router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    const client = await pool.connect();
    try {
      const body = req.body as PostAuditRequest;

      if (!body.auditId || !body.postDate || !Array.isArray(body.postShipments)) {
        res.status(400).json({ success: false, error: 'auditId, postDate y postShipments son requeridos' });
        return;
      }

      // Verificar que la auditoría existe y su fecha coincide con la del CSV
      const { rows: auditInfo } = await client.query(
        'SELECT id, hu_id, date, subca FROM audits WHERE id = $1',
        [body.auditId]
      );
      if (auditInfo.length === 0) {
        res.status(404).json({ success: false, error: 'Auditoría no encontrada' });
        return;
      }

      const auditDate = auditInfo[0].date as string; // YYYY-MM-DD
      const csvDate   = body.csvDate;                // YYYY-MM-DD

      if (csvDate && auditDate !== csvDate) {
        res.status(400).json({
          success: false,
          error: `La fecha del CSV (${csvDate}) no coincide con la fecha de la auditoría (${auditDate}). Cargá el CSV del mismo día.`,
        });
        return;
      }

      // Todos los shipments del HU auditado
      const { rows: auditRows } = await client.query(`
        SELECT a.hu_id, a.subca, a.date,
               asr.shipment_id, asr.status AS audit_status, asr.subca AS shipment_subca
        FROM audits a
        JOIN audit_shipment_results asr ON asr.audit_id = a.id
        WHERE a.id = $1
      `, [body.auditId]);

      if (auditRows.length === 0) {
        res.status(400).json({ success: false, error: 'La auditoría no tiene shipments registrados' });
        return;
      }

      const hasErrors = auditRows.some((r) => ['missing', 'surplus', 'crossed'].includes(r.audit_status));
      if (!hasErrors) {
        res.status(400).json({ success: false, error: 'No se encontraron errores en la auditoría para analizar' });
        return;
      }

      const auditHuId  = auditRows[0].hu_id  as string;
      const auditSubca = auditRows[0].subca   as string;

      // Mapa del CSV post para búsqueda O(1)
      const postMap = new Map<string, PostShipment>();
      for (const s of body.postShipments) {
        postMap.set(s.shipmentId, s);
      }

      const results: Array<{
        shipmentId: string; statusPre: string; statusAudit: string; statusPost: string;
        huPre: string; huPost: string; subca: string; corrected: boolean; correctionNote: string;
      }> = [];

      for (const row of auditRows) {
        // Shipments OK — pasan sin análisis
        if (row.audit_status === 'ok') {
          results.push({
            shipmentId: row.shipment_id, statusPre: 'in_hu', statusAudit: 'ok',
            statusPost: 'n/a', huPre: auditHuId, huPost: '', subca: row.shipment_subca || auditSubca,
            corrected: false, correctionNote: '',
          });
          continue;
        }

        const analysis = analyzeCorrection(
          row.shipment_id, row.audit_status, auditHuId,
          row.shipment_subca || auditSubca, postMap
        );
        results.push({
          shipmentId: row.shipment_id, statusPre: 'in_hu',
          statusAudit: row.audit_status, statusPost: analysis.statusPost,
          huPre: auditHuId, huPost: analysis.huPost,
          subca: row.shipment_subca || auditSubca,
          corrected: analysis.corrected, correctionNote: analysis.note,
        });
      }

      const totalFound     = results.filter((r) => r.statusAudit !== 'ok').length;
      const totalCorrected = results.filter((r) => r.corrected && r.statusAudit !== 'ok').length;

      await client.query('BEGIN');

      const { rows: paRows } = await client.query(`
        INSERT INTO post_audits
          (audit_id, post_date, csv_filename, created_by, total_errors_found, total_errors_corrected)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (audit_id) DO UPDATE SET
          post_date              = EXCLUDED.post_date,
          csv_filename           = EXCLUDED.csv_filename,
          created_by             = EXCLUDED.created_by,
          total_errors_found     = EXCLUDED.total_errors_found,
          total_errors_corrected = EXCLUDED.total_errors_corrected
        RETURNING id
      `, [body.auditId, body.postDate, body.csvFilename ?? '', req.user?.userId ?? null, totalFound, totalCorrected]);

      const postAuditId = paRows[0].id as number;
      await client.query('DELETE FROM post_audit_results WHERE post_audit_id = $1', [postAuditId]);

      if (results.length > 0) {
        const vals: unknown[] = [];
        const ph = results.map((_, i) => {
          const b = i * 9;
          return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9})`;
        });
        for (const r of results) {
          vals.push(postAuditId, r.shipmentId, r.statusPre, r.statusAudit, r.statusPost,
                    r.huPre, r.huPost, r.subca, r.corrected);
        }
        await client.query(`
          INSERT INTO post_audit_results
            (post_audit_id, shipment_id, status_pre, status_audit, status_post, hu_pre, hu_post, subca, corrected)
          VALUES ${ph.join(', ')}
        `, vals);
        for (const r of results) {
          await client.query(
            'UPDATE post_audit_results SET correction_note = $1 WHERE post_audit_id = $2 AND shipment_id = $3',
            [r.correctionNote, postAuditId, r.shipmentId]
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          id: postAuditId, auditId: body.auditId, huId: auditHuId,
          postDate: body.postDate, csvFilename: body.csvFilename,
          totalErrorsFound: totalFound, totalErrorsCorrected: totalCorrected,
          results: results.map((r, i) => ({ id: i + 1, ...r })),
        },
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  });

  // ── DELETE /api/post-audits/:id ───────────────────────────────────────────
  router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { rowCount } = await pool.query('DELETE FROM post_audits WHERE id = $1', [id]);
      if ((rowCount ?? 0) === 0) {
        res.status(404).json({ success: false, error: 'Post-audit no encontrado' });
        return;
      }
      res.json({ success: true, message: 'Post-audit eliminado' });
    } catch (err) { next(err); }
  });

  return router;
}
