import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getSession() as any;
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

        // Verify the caller may access the dashboard being duplicated.
        if (session.role !== 'admin') {
            const accessRes = await client.query(
                `SELECT 1 FROM dashboards d
                 WHERE d.id = $1 AND (
                     d.owner_id = $2 OR
                     EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2) OR
                     EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2)
                 )`,
                [dashboardId, session.id]
            );
            if (accessRes.rows.length === 0) {
                client.release();
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        // 2. Determine new name
        const newName = name || `${original.name} (Copia)`;

        // Keep the copy in the original folder only when the caller owns the
        // source; otherwise place it at the root of the caller's workspace.
        const copyFolderId = original.owner_id === session.id ? original.folder_id : null;

        // 3. Insert Copy
        const res = await client.query(
            `INSERT INTO dashboards (name, description, settings, folder_id, owner_id, start_date, end_date, is_demo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [newName, original.description, original.settings, copyFolderId, session.id, original.start_date, original.end_date, false]
        );

        const newDashboard = res.rows[0];

        // 4. Clone Tasks
        const tasksRes = await client.query('SELECT * FROM tasks WHERE dashboard_id = $1', [dashboardId]);
        const tasks = tasksRes.rows;

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const newTaskId = crypto.randomUUID();
            await client.query(
                `INSERT INTO tasks (
                    id, name, status, prio, owner, type, week, gate, 
                    dashboard_id, description, due
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    newTaskId, task.name, task.status, task.prio, task.owner, task.type, task.week, task.gate,
                    newDashboard.id, task.description, task.due
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
