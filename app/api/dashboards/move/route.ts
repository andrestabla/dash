import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { dashboardId, folderId } = body;

        if (!dashboardId) return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });

        const client = await pool.connect();
        await client.query(
            'UPDATE dashboards SET folder_id = $1 WHERE id = $2',
            [folderId || null, dashboardId]
        );
        client.release();

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to move dashboard' }, { status: 500 });
    }
}
