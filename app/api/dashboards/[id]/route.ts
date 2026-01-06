import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession() as any;
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await props.params;
        const { id } = params;
        const client = await pool.connect();

        const result = await client.query('SELECT * FROM dashboards WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        const dashboard = result.rows[0];

        // Access Control
        const isAdmin = session.role === 'admin';
        const isOwner = dashboard.owner_id === session.id;

        let isCollaborator = false;
        if (!isOwner && !isAdmin) {
            const collRes = await client.query(
                'SELECT id FROM dashboard_collaborators WHERE dashboard_id = $1 AND user_id = $2',
                [id, session.id]
            );
            isCollaborator = collRes.rows.length > 0;
        }

        client.release();

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: 'Access Denied: You are not a collaborator on this dashboard.' }, { status: 403 });
        }

        return NextResponse.json(dashboard);
    } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
