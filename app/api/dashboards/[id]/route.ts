import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM dashboards WHERE id = $1', [id]);
        client.release();

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        const dashboard = result.rows[0];

        // Access Control
        // 1. Admins have full access
        // 2. Owners (listed in settings.owners) have access
        const isOwner = dashboard.settings?.owners?.includes(session.email);
        const isAdmin = session.role === 'admin';

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Access Denied: You are not a collaborator on this dashboard.' }, { status: 403 });
        }

        return NextResponse.json(dashboard);
    } catch (error) {
        console.error('DB Error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
