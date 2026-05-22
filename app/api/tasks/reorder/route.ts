import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { publishDashboardRealtime } from '@/lib/realtime';
import { unauthorized, badRequest, forbidden, serverError } from '@/lib/api-error';
import { gestorClause } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

// PUT /api/tasks/reorder — persist the manual order of Kanban tasks after a
// drag. Updates each affected task's `position` (and `status`, since a drag
// may also move the task to another column).
// Body: { dashboardId, items: [{ id, status, position }] }.
export async function PUT(request: Request) {
    const session = (await getSession()) as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { dashboardId, items } = body;

        if (!dashboardId || !Array.isArray(items)) {
            return badRequest('dashboardId and items are required');
        }

        const client = await pool.connect();
        try {
            // Permission: admin, owner, direct/folder collaborator, or gestor.
            const accessQuery = session.role === 'admin'
                ? 'SELECT id FROM dashboards WHERE id = $1'
                : `SELECT id FROM dashboards d
                   WHERE id = $1 AND (
                       owner_id = $2 OR
                       EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2) OR
                       EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2) OR
                       ${gestorClause('d', '$2')}
                   )`;
            const accessParams = session.role === 'admin' ? [dashboardId] : [dashboardId, session.id];
            const access = await client.query(accessQuery, accessParams);
            if (access.rows.length === 0) return forbidden('Access denied');

            try {
                await client.query('BEGIN');
                for (const item of items) {
                    if (!item || !item.id) continue;
                    await client.query(
                        'UPDATE tasks SET position = $1, status = $2 WHERE id = $3 AND dashboard_id = $4',
                        [Number(item.position) || 0, String(item.status), item.id, dashboardId]
                    );
                }
                await client.query('COMMIT');
            } catch (txError) {
                await client.query('ROLLBACK');
                throw txError;
            }

            await publishDashboardRealtime(String(dashboardId), 'tasks_changed');
            return NextResponse.json({ message: 'Order saved', count: items.length });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Task reorder error:', error);
        return serverError('Failed to reorder tasks');
    }
}
