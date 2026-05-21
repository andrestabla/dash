import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, badRequest, forbidden, serverError } from '@/lib/api-error';
import { gestorClause } from '@/lib/workspace-access';

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { dashboardId, folderId, workspaceId } = body;

        if (!dashboardId) return badRequest('Dashboard ID required');

        const client = await pool.connect();
        try {
            // Verify the caller may access the dashboard being moved.
            const dashAccessQuery = session.role === 'admin'
                ? 'SELECT id FROM dashboards WHERE id = $1'
                : `SELECT id FROM dashboards d
                   WHERE id = $1 AND (
                       owner_id = $2 OR
                       EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2) OR
                       EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2) OR
                       ${gestorClause('d', '$2')}
                   )`;
            const dashAccess = await client.query(
                dashAccessQuery,
                session.role === 'admin' ? [dashboardId] : [dashboardId, session.id]
            );
            if (dashAccess.rows.length === 0) {
                return forbidden('Access denied');
            }

            // If moving into a folder, verify the caller may access that folder too.
            if (folderId) {
                const folderAccessQuery = session.role === 'admin'
                    ? 'SELECT id FROM folders WHERE id = $1'
                    : `SELECT id FROM folders f
                       WHERE id = $1 AND (
                           owner_id = $2 OR
                           EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = f.id AND fc.user_id = $2) OR
                           ${gestorClause('f', '$2')}
                       )`;
                const folderAccess = await client.query(
                    folderAccessQuery,
                    session.role === 'admin' ? [folderId] : [folderId, session.id]
                );
                if (folderAccess.rows.length === 0) {
                    return forbidden('Access denied');
                }
            }

            // When moving to another workspace, the caller must belong to it.
            if (workspaceId && session.role !== 'admin') {
                const mem = await client.query(
                    `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'`,
                    [workspaceId, session.id]
                );
                if (mem.rows.length === 0) return forbidden('No perteneces al workspace destino');
            }

            // The dashboard adopts the workspace of its target folder; with no
            // folder it takes the explicit workspace, otherwise keeps its own.
            await client.query(
                `UPDATE dashboards
                 SET folder_id = $1,
                     workspace_id = COALESCE(
                         (SELECT workspace_id FROM folders WHERE id = $1),
                         $3::uuid,
                         workspace_id
                     )
                 WHERE id = $2`,
                [folderId || null, dashboardId, workspaceId || null]
            );

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Dashboard Move Error', error);
        return serverError('Failed to move dashboard');
    }
}
