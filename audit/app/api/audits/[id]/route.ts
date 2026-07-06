import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// ── DELETE /api/audits/[id] ──────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/audits/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM audits WHERE id = ?').run(numId);

    if (info.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Auditoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error('[DELETE /api/audits/[id]]', err);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar' },
      { status: 500 }
    );
  }
}

// ── GET /api/audits/[id] ─────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/audits/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const db  = getDb();
    const row = db.prepare('SELECT * FROM audits WHERE id = ?').get(numId);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'No encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error('[GET /api/audits/[id]]', err);
    return NextResponse.json(
      { success: false, error: 'Error al buscar' },
      { status: 500 }
    );
  }
}
