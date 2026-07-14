import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { publishDashboardRealtime } from '@/lib/realtime';
import { unauthorized, badRequest, notFound, forbidden, serverError } from '@/lib/api-error';
import { gestorClause, isGestorOf } from '@/lib/workspace-access';

// GET /api/dashboards/trash
// Lists the soft-deleted dashboards the caller may govern (admin, owner, or
// gestor of the board's workspace). Each row carries the folder name and task
// count so the trash UI can show useful context before restoring.
export async function GET() {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const client = await pool.connect();
        try {
            const isAdmin = session.role === 'admin';
            const query = isAdmin
                ? `SELECT d.id, d.name, d.folder_id, d.workspace_id, d.deleted_at,
                          f.name AS folder_name,
                          (SELECT COUNT(*)::int FROM tasks t WHERE t.dashboard_id = d.id) AS task_count
                     FROM dashboards d
                     LEFT JOIN folders f ON f.id = d.folder_id
                    WHERE d.deleted_at IS NOT NULL
                    ORDER BY d.deleted_at DESC`
                : `SELECT d.id, d.name, d.folder_id, d.workspace_id, d.deleted_at,
                          f.name AS folder_name,
                          (SELECT COUNT(*)::int FROM tasks t WHERE t.dashboard_id = d.id) AS task_count
                     FROM dashboards d
                     LEFT JOIN folders f ON f.id = d.folder_id
                    WHERE d.deleted_at IS NOT NULL
                      AND (d.owner_id = $1 OR ${gestorClause('d', '$1')})
                    ORDER BY d.deleted_at DESC`;

            const params = isAdmin ? [] : [session.id];
            const result = await client.query(query, params);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Trash list error:', error);
        return serverError('Database error');
    }
}

// POST /api/dashboards/trash
// Body: { id: string, action: 'restore' | 'purge' }
//   restore -> clears deleted_at, bringing the board (and its intact tasks) back
//   purge   -> permanently deletes the board; only allowed on already-trashed rows
export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    let body: { id?: string; action?: string };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const { id, action } = body;
    if (!id) return badRequest('ID required');
    if (action !== 'restore' && action !== 'purge') return badRequest('Invalid action');

    try {
        const client = await pool.connect();
        try {
            // The board must currently be in the trash to act on it here.
            const check = await client.query(
                'SELECT owner_id, workspace_id, is_demo, deleted_at FROM dashboards WHERE id = $1',
                [id]
            );
            if (check.rows.length === 0 || !check.rows[0].deleted_at) {
                return notFound('Trashed dashboard not found');
            }
            const dashboard = check.rows[0];

            // Same governance model as deletion: admin, owner, or workspace gestor.
            if (session.role !== 'admin' && dashboard.owner_id !== session.id) {
                const gestor = await isGestorOf(client, session.id, dashboard.workspace_id);
                if (!gestor) return forbidden();
            }

            if (action === 'restore') {
                await client.query('UPDATE dashboards SET deleted_at = NULL WHERE id = $1', [id]);
                await publishDashboardRealtime(String(id), 'dashboard_restored');
                return NextResponse.json({ success: true, id, restored: true });
            }

            // action === 'purge' — irreversible hard delete.
            if (dashboard.is_demo && session.role !== 'admin') {
                return forbidden('Cannot delete demo dashboard');
            }
            await client.query('DELETE FROM dashboards WHERE id = $1', [id]);
            return NextResponse.json({ success: true, id, purged: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Trash action error:', error);
        return serverError('Failed to update trash');
    }
}
