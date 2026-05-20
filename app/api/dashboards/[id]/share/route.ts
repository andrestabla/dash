import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/api-error';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession() as any;
    if (!session) return unauthorized();

    const body = await request.json();
    const { action } = body;
    const dashboardId = params.id;

    try {
        const client = await pool.connect();
        try {
            const dashRes = await client.query(
                'SELECT owner_id, folder_id FROM dashboards WHERE id = $1',
                [dashboardId]
            );
            if (dashRes.rows.length === 0) {
                return notFound('Dashboard not found');
            }
            const dashboard = dashRes.rows[0];

            const isAdmin = session.role === 'admin';
            const isOwner = dashboard.owner_id === session.id;
            const canManage = isAdmin || isOwner;

            // Publishing and granting/revoking access are owner/admin only —
            // a viewer-level collaborator must not be able to escalate sharing.
            if (
                (action === 'toggle_public' || action === 'add_collaborator' || action === 'remove_collaborator')
                && !canManage
            ) {
                return forbidden('Access denied');
            }

            if (action === 'toggle_public') {
                const { isPublic } = body;
                let token = null;

                if (isPublic) {
                    // Generate token if not exists
                    const res = await client.query('SELECT public_token FROM dashboards WHERE id = $1', [dashboardId]);
                    token = res.rows[0]?.public_token;

                    if (!token) {
                        token = crypto.randomUUID();
                        await client.query('UPDATE dashboards SET is_public = TRUE, public_token = $1 WHERE id = $2', [token, dashboardId]);
                    } else {
                        await client.query('UPDATE dashboards SET is_public = TRUE WHERE id = $1', [dashboardId]);
                    }
                } else {
                    await client.query('UPDATE dashboards SET is_public = FALSE WHERE id = $1', [dashboardId]);
                }

                return NextResponse.json({ success: true, isPublic, token });
            }

            if (action === 'add_collaborator') {
                const { userId } = body;
                // Check if already exists in new permissions table
                await client.query(`
                    INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role)
                    VALUES ($1, $2, 'viewer')
                    ON CONFLICT (dashboard_id, user_id) DO NOTHING
                `, [dashboardId, userId]);

                // Notify User
                await client.query(`
                        INSERT INTO notifications (user_id, title, message)
                        VALUES ($1, 'Nuevo Tablero Compartido', 'Has sido añadido como colaborador a un tablero.')
                     `, [userId]);

                return NextResponse.json({ success: true });
            }

            if (action === 'remove_collaborator') {
                const { userId } = body;
                await client.query('DELETE FROM dashboard_user_permissions WHERE dashboard_id = $1 AND user_id = $2', [dashboardId, userId]);
                return NextResponse.json({ success: true });
            }

            if (action === 'list_collaborators') {
                // Any user with access to the dashboard may view its member list.
                let hasAccess = canManage;
                if (!hasAccess) {
                    const accessRes = await client.query(
                        `SELECT 1 FROM dashboard_user_permissions WHERE dashboard_id = $1 AND user_id = $2
                         UNION ALL
                         SELECT 1 FROM folder_collaborators WHERE folder_id = $3 AND user_id = $2`,
                        [dashboardId, session.id, dashboard.folder_id]
                    );
                    hasAccess = accessRes.rows.length > 0;
                }
                if (!hasAccess) {
                    return forbidden('Access denied');
                }

                const res = await client.query(`
                    SELECT u.id, u.name, u.email, dup.role
                    FROM dashboard_user_permissions dup
                    JOIN users u ON dup.user_id = u.id
                    WHERE dup.dashboard_id = $1
                    UNION
                    SELECT u.id, u.name, u.email, 'owner' as role
                    FROM dashboards d
                    JOIN users u ON d.owner_id = u.id
                    WHERE d.id = $1
                `, [dashboardId]);
                const tokenRes = await client.query('SELECT is_public, public_token FROM dashboards WHERE id = $1', [dashboardId]);

                return NextResponse.json({
                    collaborators: res.rows,
                    isPublic: tokenRes.rows[0]?.is_public,
                    publicToken: tokenRes.rows[0]?.public_token
                });
            }

            return badRequest('Invalid action');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Share API Error:", error);
        return serverError();
    }
}
