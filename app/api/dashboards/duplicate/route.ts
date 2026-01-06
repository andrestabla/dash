import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { dashboardId, name } = body; // Optional new name

        if (!dashboardId) return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });

        const client = await pool.connect();

        // 1. Get original dashboard
        const originalRes = await client.query('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
        if (originalRes.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }
        const original = originalRes.rows[0];

        // 2. Determine new name
        const newName = name || `${original.name} (Copia)`;

        // 3. Insert Copy
        // We copy description, settings, folder_id. 
        // We DO NOT copy id, created_at.
        const res = await client.query(
            `INSERT INTO dashboards (name, description, settings, folder_id) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [newName, original.description, original.settings, original.folder_id]
        );

        const newDashboard = res.rows[0];

        // OPTIONAL: Copy Columns/Tasks? 
        // For now, we are doing STRUCTURE ONLY (Empty Board with same settings).
        // If we wanted to copy tasks, we would need to fetch all columns/tasks and re-insert them mapped to new ID.
        // Given complexity and "LGTM" on plan, we stick to structure.

        client.release();

        return NextResponse.json(newDashboard);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to duplicate dashboard' }, { status: 500 });
    }
}
