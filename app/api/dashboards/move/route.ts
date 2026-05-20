import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { dashboardId, folderId } = body;

        if (!dashboardId) return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });

        const client = await pool.connect();
        try {
            // Verify the caller may access the dashboard being moved.
            const dashAccessQuery = session.role === 'admin'
                ? 'SELECT id FROM dashboards WHERE id = $1'
                : `SELECT id FROM dashboards d
                   WHERE id = $1 AND (
                       owner_id = $2 OR
                       EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2) OR
                       EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2)
                   )`;
            const dashAccess = await client.query(
                dashAccessQuery,
                session.role === 'admin' ? [dashboardId] : [dashboardId, session.id]
            );
            if (dashAccess.rows.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            // If moving into a folder, verify the caller may access that folder too.
            if (folderId) {
                const folderAccessQuery = session.role === 'admin'
                    ? 'SELECT id FROM folders WHERE id = $1'
                    : `SELECT id FROM folders f
                       WHERE id = $1 AND (
                           owner_id = $2 OR
                           EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = f.id AND fc.user_id = $2)
                       )`;
                const folderAccess = await client.query(
                    folderAccessQuery,
                    session.role === 'admin' ? [folderId] : [folderId, session.id]
                );
                if (folderAccess.rows.length === 0) {
                    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
                }
            }

            await client.query(
                'UPDATE dashboards SET folder_id = $1 WHERE id = $2',
                [folderId || null, dashboardId]
            );

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Dashboard Move Error', error);
        return NextResponse.json({ error: 'Failed to move dashboard' }, { status: 500 });
    }
}
