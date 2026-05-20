import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, forbidden, notFound, serverError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession() as any;
    if (!session) {
        return unauthorized();
    }

    const { id } = await params;

    try {
        const client = await pool.connect();
        try {
            // Verify the caller may access this dashboard before exposing its members.
            const dashRes = await client.query(
                'SELECT owner_id, folder_id FROM dashboards WHERE id = $1',
                [id]
            );
            if (dashRes.rows.length === 0) {
                return notFound('Dashboard not found');
            }
            const dashboard = dashRes.rows[0];

            let hasAccess = session.role === 'admin' || dashboard.owner_id === session.id;
            if (!hasAccess) {
                const accessRes = await client.query(
                    `SELECT 1 FROM dashboard_user_permissions WHERE dashboard_id = $1 AND user_id = $2
                     UNION ALL
                     SELECT 1 FROM folder_collaborators WHERE folder_id = $3 AND user_id = $2`,
                    [id, session.id, dashboard.folder_id]
                );
                hasAccess = accessRes.rows.length > 0;
            }
            if (!hasAccess) {
                return forbidden('Access denied');
            }

            // Get all users who have permission to this dashboard
            const permissionsRes = await client.query(`
                SELECT
                    dup.user_id,
                    dup.role,
                    dup.created_at,
                    u.email as user_email,
                    u.name as user_name
                FROM dashboard_user_permissions dup
                JOIN users u ON dup.user_id = u.id
                WHERE dup.dashboard_id = $1
                ORDER BY u.name, u.email
            `, [id]);

            return NextResponse.json({
                permissions: permissionsRes.rows
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching dashboard permissions:', error);
        return serverError('Failed to fetch permissions');
    }
}
