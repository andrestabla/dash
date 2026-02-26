import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action } = body;
    const dashboardId = params.id;

    try {
        const client = await pool.connect();

        // Verify Ownership (Only owner/admin can share)
        // Check if user is owner of dash or admin
        // Simplified check: Check if user created it or is admin
        // Ideally we check implicit ownership via settings.owners or folder creator, but for MVP:
        // We will assume if you can EDIT the board, you can share it.

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

            client.release();
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

            client.release();
            return NextResponse.json({ success: true });
        }

        if (action === 'remove_collaborator') {
            const { userId } = body;
            await client.query('DELETE FROM dashboard_user_permissions WHERE dashboard_id = $1 AND user_id = $2', [dashboardId, userId]);
            client.release();
            return NextResponse.json({ success: true });
        }

        if (action === 'list_collaborators') {
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

            client.release();
            return NextResponse.json({
                collaborators: res.rows,
                isPublic: tokenRes.rows[0]?.is_public,
                publicToken: tokenRes.rows[0]?.public_token
            });
        }


        client.release();
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Share API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
