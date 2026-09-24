import * as XLSX from 'xlsx';
import { Pool } from 'pg';
import { Resend } from 'resend';

// ── Tipos internos ────────────────────────────────────────────────────────────

interface AuditRow {
  id: number;
  hu_id: string;
  date: string;
  shift: string;
  subca: string;
  observations: string;
  total_system: number;
  total_scanned: number;
  total_ok: number;
  total_missing: number;
  total_surplus: number;
  total_crossed: number;
  total_unmanifested: number;
  assembly_users: string[];
  crossed_hus: string[];
  system_shipments: string[];
  scanned_shipments: string[];
  created_by: number | null;
  created_by_nombre: string | null;
  created_by_apellido: string | null;
  created_at: Date;
}

interface ShipmentResultRow {
  audit_id: number;
  shipment_id: string;
  status: string;
  subca: string;
  status_description: string;
  labeling_last_print_user: string;
  labeling_authorization_date: string;
  outbound_user_ids: string;
  dispatched: boolean;
  crossed_from_hu: string | null;
}

// ── Cliente de Resend (lazy — se inicializa recién cuando se usa) ─────────────
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('[Backup] RESEND_API_KEY no está configurada');
    _resend = new Resend(key);
  }
  return _resend;
}
const BACKUP_EMAIL_TO   = () => process.env.BACKUP_EMAIL_TO   ?? 'franco.nahuel.romero@ocasa.com';
const BACKUP_EMAIL_FROM = () => process.env.BACKUP_EMAIL_FROM ?? 'onboarding@resend.dev';

// ── Generador del Excel ───────────────────────────────────────────────────────

function buildExcel(audits: AuditRow[], shipments: ShipmentResultRow[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Mapa rápido audit_id → shipments
  const shipmentsByAudit = new Map<number, ShipmentResultRow[]>();
  for (const s of shipments) {
    const list = shipmentsByAudit.get(s.audit_id) ?? [];
    list.push(s);
    shipmentsByAudit.set(s.audit_id, list);
  }

  // ── Hoja 1: Resumen por fecha ────────────────────────────────────────────
  const byDate = new Map<string, AuditRow[]>();
  for (const a of audits) {
    const list = byDate.get(a.date) ?? [];
    list.push(a);
    byDate.set(a.date, list);
  }

  const dailyRows = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => {
    const totalHus       = list.length;
    const husConDesvio   = list.filter(a => a.total_missing > 0 || a.total_crossed > 0 || a.total_unmanifested > 0).length;
    const totalShipments = list.reduce((s, a) => s + Number(a.total_system), 0);
    const totalMissing   = list.reduce((s, a) => s + Number(a.total_missing), 0);
    const totalCrossed   = list.reduce((s, a) => s + Number(a.total_crossed), 0);
    const totalUnman     = list.reduce((s, a) => s + Number(a.total_unmanifested), 0);
    const totalErrors    = totalMissing + totalCrossed + totalUnman;
    return {
      'Fecha':                date,
      'HUs auditados':        totalHus,
      'HUs con desvío':       husConDesvio,
      '% HUs con desvío':     totalHus > 0 ? `${((husConDesvio / totalHus) * 100).toFixed(2)}%` : '0.00%',
      'Shipments':            totalShipments,
      'Faltantes':            totalMissing,
      'Cruzados':             totalCrossed,
      'Sin manifestar':       totalUnman,
      '% con errores':        totalShipments > 0 ? `${((totalErrors / totalShipments) * 100).toFixed(2)}%` : '0.00%',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Por Fecha');

  // ── Hoja 2: Por Sub-CA ───────────────────────────────────────────────────
  const bySubca = new Map<string, AuditRow[]>();
  for (const a of audits) {
    const list = bySubca.get(a.subca) ?? [];
    list.push(a);
    bySubca.set(a.subca, list);
  }

  const subcaRows = [...bySubca.entries()].map(([subca, list]) => ({
    'Sub-CA':         subca,
    'HUs auditados':  list.length,
    'Shipments':      list.reduce((s, a) => s + Number(a.total_system), 0),
    'OK':             list.reduce((s, a) => s + Number(a.total_ok), 0),
    'Faltantes':      list.reduce((s, a) => s + Number(a.total_missing), 0),
    'Cruzados':       list.reduce((s, a) => s + Number(a.total_crossed), 0),
    'Sin manifestar': list.reduce((s, a) => s + Number(a.total_unmanifested), 0),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subcaRows), 'Por Sub-CA');

  // ── Hoja 3: Historial completo ────────────────────────────────────────────
  const histRows = audits.map((a) => ({
    'Auditor':         a.created_by_nombre && a.created_by_apellido
      ? `${a.created_by_nombre} ${a.created_by_apellido}`.trim()
      : '',
    'Fecha':           a.date,
    'Turno':           a.shift,
    'HU':              a.hu_id,
    'Sub-CA':          a.subca,
    'Sistema':         Number(a.total_system),
    'Bipeados':        Number(a.total_scanned),
    'OK':              Number(a.total_ok),
    'Faltantes':       Number(a.total_missing),
    'Sobrantes':       Number(a.total_surplus),
    'Cruzados':        Number(a.total_crossed),
    'Sin manifestar':  Number(a.total_unmanifested),
    'Usuarios armado': Array.isArray(a.assembly_users) ? a.assembly_users.join(', ') : '',
    'Observaciones':   a.observations,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(histRows), 'Historial');

  // ── Hoja 4: Ranking usuarios de armado ───────────────────────────────────
  const byUser = new Map<string, { hus: number; shipments: number; errors: number }>();
  for (const a of audits) {
    const users = Array.isArray(a.assembly_users) ? a.assembly_users : [];
    for (const u of users) {
      const s = byUser.get(u) ?? { hus: 0, shipments: 0, errors: 0 };
      s.hus       += 1;
      s.shipments += Number(a.total_system);
      s.errors    += Number(a.total_missing) + Number(a.total_crossed) + Number(a.total_unmanifested);
      byUser.set(u, s);
    }
  }
  const userRows = [...byUser.entries()]
    .map(([userId, s]) => ({
      'Usuario':    userId,
      'HUs':        s.hus,
      'Shipments':  s.shipments,
      'Errores':    s.errors,
      'Tasa error': s.shipments > 0
        ? `${((s.errors / s.shipments) * 100).toFixed(2)}%`
        : '0.00%',
    }))
    .sort((a, b) => b.Errores - a.Errores);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userRows), 'Usuarios Armado');

  // ── Hoja 5: Detalle de shipments ─────────────────────────────────────────
  const statusLabel: Record<string, string> = {
    ok:           'OK',
    missing:      'Faltante',
    surplus:      'Sobrante',
    crossed:      'Cruzado',
    unmanifested: 'Sin manifestar',
  };

  const shipmentRows: Record<string, string | number | boolean>[] = [];
  for (const a of audits) {
    const results = shipmentsByAudit.get(a.id) ?? [];
    results.forEach((r, idx) => {
      const isFirst = idx === 0;
      shipmentRows.push({
        'Fecha':              a.date,
        'Turno':              a.shift,
        'HU':                 a.hu_id,
        'Sub-CA':             a.subca,
        'QPiezas':            isFirst ? Number(a.total_system)       : '',
        'QFaltantes':         isFirst ? Number(a.total_missing)      : '',
        'QSobrantes':         isFirst ? Number(a.total_surplus)      : '',
        'QCruzados':          isFirst ? Number(a.total_crossed)      : '',
        'QSinManifestados':   isFirst ? Number(a.total_unmanifested) : '',
        'Auditor':            isFirst
          ? (a.created_by_nombre && a.created_by_apellido
              ? `${a.created_by_nombre} ${a.created_by_apellido}`.trim()
              : '')
          : '',
        'Shipment ID':        r.shipment_id,
        'Estado':             statusLabel[r.status] ?? r.status,
        'Sub-CA shipment':    r.subca,
        'Usuario impresión':  r.labeling_last_print_user,
        'Fecha autorización': r.labeling_authorization_date,
        'Usuarios armado':    r.outbound_user_ids,
        'Despachado':         r.dispatched ? 'Sí' : 'No',
        'HU origen (cruzado)': r.crossed_from_hu ?? '',
      });
    });
  }
  if (shipmentRows.length > 0) {
    const wsShip = XLSX.utils.json_to_sheet(shipmentRows);
    wsShip['!cols'] = Array(18).fill({ wch: 22 });
    XLSX.utils.book_append_sheet(wb, wsShip, 'Detalle Shipments');
  }

  return wb;
}

// ── Función principal de backup ───────────────────────────────────────────────

export async function runDailyBackup(pool: Pool): Promise<void> {
  const today     = new Date();
  // Backup de los datos del día ANTERIOR (ayer)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

  console.log(`[Backup] Iniciando backup del día ${targetDate}...`);

  // 1. Obtener auditorías del día objetivo
  const { rows: auditRows } = await pool.query<AuditRow>(
    `SELECT a.*,
            u.nombre   AS created_by_nombre,
            u.apellido AS created_by_apellido
     FROM audits a
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.date = $1
     ORDER BY a.created_at ASC`,
    [targetDate]
  );

  if (auditRows.length === 0) {
    console.log(`[Backup] Sin datos para ${targetDate}. No se genera archivo.`);
    return;
  }

  // 2. Obtener todos los shipment results de esas auditorías
  const auditIds     = auditRows.map((r) => r.id);
  const placeholders = auditIds.map((_, i) => `$${i + 1}`).join(', ');
  const { rows: shipmentRows } = await pool.query<ShipmentResultRow>(
    `SELECT * FROM audit_shipment_results
     WHERE audit_id IN (${placeholders})
     ORDER BY audit_id, id`,
    auditIds
  );

  // 3. Generar el Excel en memoria (sin escribir al disco)
  const wb       = buildExcel(auditRows, shipmentRows);
  const filename = `backup_${targetDate}.xlsx`;
  // write() devuelve un Buffer cuando se pasa type: 'buffer'
  const buffer   = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  console.log(`[Backup] Excel generado en memoria (${buffer.length} bytes).`);

  // 4. Enviar por email con el Excel como adjunto
  const { error: emailError } = await getResend().emails.send({
    from:    BACKUP_EMAIL_FROM(),
    to:      BACKUP_EMAIL_TO(),
    subject: `Backup auditorías ${targetDate}`,
    html: `
      <p>Backup automático del sistema de auditorías.</p>
      <p><strong>Fecha:</strong> ${targetDate}</p>
      <p><strong>HUs auditados:</strong> ${auditRows.length}</p>
      <p><strong>Shipments:</strong> ${shipmentRows.length}</p>
      <p>El archivo Excel con el detalle completo se adjunta a este correo.</p>
    `,
    attachments: [
      {
        filename: filename,
        content:  buffer,
      },
    ],
  });

  if (emailError) {
    // Si falla el email NO borramos los datos — se reintentará en el próximo cron
    console.error('[Backup] Error al enviar el email. Los datos NO fueron eliminados:', emailError);
    throw new Error(`[Backup] Fallo el envío del email: ${emailError.message}`);
  }

  console.log(`[Backup] Email enviado a ${BACKUP_EMAIL_TO()} con adjunto ${filename}.`);

  // 5. Eliminar datos auditados SOLO si el email fue exitoso
  //    (CASCADE borra shipment_results y post_audit_results automáticamente)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `DELETE FROM audits WHERE date = $1`,
      [targetDate]
    );

    // Borrar planes del día también
    await client.query(
      `DELETE FROM audit_plans WHERE date = $1`,
      [targetDate]
    );

    await client.query('COMMIT');
    console.log(`[Backup] ${rowCount} auditorías eliminadas de la DB para ${targetDate}.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Backup] Error al limpiar la DB (el email ya fue enviado):', err);
    throw err;
  } finally {
    client.release();
  }

  console.log(`[Backup] Completado exitosamente para ${targetDate}.`);
}
