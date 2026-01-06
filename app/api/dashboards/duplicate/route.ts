import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
        const res = await client.query(
            `INSERT INTO dashboards (name, description, settings, folder_id) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [newName, original.description, original.settings, original.folder_id]
        );

        const newDashboard = res.rows[0];

        // 4. Clone Tasks
        const tasksRes = await client.query('SELECT * FROM tasks WHERE dashboard_id = $1', [dashboardId]);
        const tasks = tasksRes.rows;

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const newTaskId = Date.now() + i; // Generate unique BIGINT ID similar to frontend
            await client.query(
                `INSERT INTO tasks (
                    id, name, status, prio, owner, type, week, gate, 
                    dashboard_id, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
                [
                    newTaskId, task.name, task.status, task.prio, task.owner, task.type, task.week, task.gate,
                    newDashboard.id, task.description
                ]
            );
        }

        client.release();

        return NextResponse.json(newDashboard);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to duplicate dashboard' }, { status: 500 });
    }
}
