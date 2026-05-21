import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { canGovernWorkspace } from '@/lib/workspace-access';
import { unauthorized, badRequest, forbidden, serverError } from '@/lib/api-error';

// POST /api/workspaces/[id]/notify — a gestor/admin sends an in-app
// notification to every active member of the workspace.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession() as any;
    if (!session) return unauthorized();
    const { id: workspaceId } = await params;

    try {
        const body = await request.json();
        const title = String(body.title || '').trim();
        const message = String(body.message || '').trim();
        const link = body.link ? String(body.link).trim() : null;
        if (!title || !message) return badRequest('Título y mensaje son obligatorios');

        const client = await pool.connect();
        try {
            if (!(await canGovernWorkspace(client, session, workspaceId))) {
                return forbidden('No gobiernas este workspace');
            }
            const res = await client.query(
                `INSERT INTO notifications (user_id, title, message, link)
                 SELECT wm.user_id, $2, $3, $4
                 FROM workspace_members wm
                 WHERE wm.workspace_id = $1 AND wm.status = 'active' AND wm.user_id <> $5`,
                [workspaceId, title, message, link, session.id]
            );
            await logAction(workspaceId, 'WORKSPACE_NOTIFY', `Notificación enviada (${res.rowCount} destinatarios)`, session.id, client);
            return NextResponse.json({ success: true, recipients: res.rowCount });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Workspace notify error', error);
        return serverError('No se pudo enviar la notificación');
    }
}
