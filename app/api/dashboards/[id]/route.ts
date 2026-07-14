import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, forbidden, notFound, serverError } from '@/lib/api-error';
import { isGestorOf } from '@/lib/workspace-access';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession() as any;
        if (!session) {
            return unauthorized();
        }

        const params = await props.params;
        const { id } = params;
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM dashboards WHERE id = $1 AND deleted_at IS NULL', [id]);

            if (result.rows.length === 0) {
                return notFound('Dashboard not found');
            }

            const dashboard = result.rows[0];

            // Access Control
            const isAdmin = session.role === 'admin';
            const isOwner = dashboard.owner_id === session.id;

            let isCollaborator = false;
            let isGestor = false;
            if (!isOwner && !isAdmin) {
                // Check dashboard_user_permissions table
                const permRes = await client.query(
                    'SELECT id FROM dashboard_user_permissions WHERE dashboard_id = $1 AND user_id = $2',
                    [id, session.id]
                );
                isCollaborator = permRes.rows.length > 0;

                // If not directly shared, check if parent folder is shared
                if (!isCollaborator && dashboard.folder_id) {
                    const folderCollRes = await client.query(
                        'SELECT id FROM folder_collaborators WHERE folder_id = $1 AND user_id = $2',
                        [dashboard.folder_id, session.id]
                    );
                    isCollaborator = folderCollRes.rows.length > 0;
                }

                // A gestor governs every dashboard in their workspace.
                if (!isCollaborator) {
                    isGestor = await isGestorOf(client, session.id, dashboard.workspace_id);
                }
            }

            if (!isAdmin && !isOwner && !isCollaborator && !isGestor) {
                return forbidden('Access Denied: You are not a collaborator on this dashboard.');
            }

            return NextResponse.json(dashboard);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        return serverError('Database error');
    }
}
