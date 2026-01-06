import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const dashboardId = searchParams.get('dashboardId');
        const folderId = searchParams.get('folderId');

        const client = await pool.connect();

        // Base Query
        let query = 'SELECT id, week, name, status, owner, type, prio, gate, due, description as desc, dashboard_id FROM tasks';
        const params: any[] = [];

        if (dashboardId) {
            // Check Access to specific dashboard
            const accessQuery = session.role === 'admin'
                ? 'SELECT id FROM dashboards WHERE id = $1'
                : `SELECT d.id FROM dashboards d 
                   LEFT JOIN dashboard_collaborators dc ON d.id = dc.dashboard_id 
                   WHERE d.id = $1 AND (d.owner_id = $2 OR dc.user_id = $2)`;

            const accessParams = session.role === 'admin' ? [dashboardId] : [dashboardId, session.id];
            const accessCheck = await client.query(accessQuery, accessParams);

            if (accessCheck.rows.length === 0) {
                client.release();
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            query += ' WHERE dashboard_id = $1';
            params.push(dashboardId);
        } else if (folderId !== null && folderId !== undefined && folderId !== 'null') {
            // RECURSIVE Consolidated for a specific folder
            const dashQuery = session.role === 'admin'
                ? `WITH RECURSIVE subfolders AS (
                        SELECT id FROM folders WHERE id = $1
                        UNION ALL
                        SELECT f.id FROM folders f JOIN subfolders sf ON f.parent_id = sf.id
                    )
                    SELECT id FROM dashboards WHERE folder_id IN (SELECT id FROM subfolders)`
                : `WITH RECURSIVE subfolders AS (
                        SELECT id FROM folders WHERE id = $1
                        UNION ALL
                        SELECT f.id FROM folders f JOIN subfolders sf ON f.parent_id = sf.id
                    )
                    SELECT d.id FROM dashboards d 
                    LEFT JOIN dashboard_collaborators dc ON d.id = dc.dashboard_id 
                    WHERE d.folder_id IN (SELECT id FROM subfolders) 
                    AND (d.owner_id = $2 OR dc.user_id = $2)
                    GROUP BY d.id`;

            const dashParams = session.role === 'admin' ? [folderId] : [folderId, session.id];
            const dashResult = await client.query(dashQuery, dashParams);
            const dashIds = dashResult.rows.map(r => r.id);

            if (dashIds.length === 0) {
                client.release();
                return NextResponse.json([]);
            }

            const placeholders = dashIds.map((_, i) => `$${i + 1}`).join(',');
            query += ` WHERE dashboard_id IN (${placeholders})`;
            params.push(...dashIds);
        } else {
            // GLOBAL Consolidated (Everything accessible to the user across ALL folders)
            const dashQuery = session.role === 'admin'
                ? 'SELECT id FROM dashboards'
                : `SELECT d.id FROM dashboards d 
                   LEFT JOIN dashboard_collaborators dc ON d.id = dc.dashboard_id 
                   WHERE d.owner_id = $1 OR dc.user_id = $1
                   GROUP BY d.id`;

            const dashParams = session.role === 'admin' ? [] : [session.id];
            const dashResult = await client.query(dashQuery, dashParams);
            const dashIds = dashResult.rows.map(r => r.id);

            if (dashIds.length === 0) {
                client.release();
                return NextResponse.json([]);
            }

            const placeholders = dashIds.map((_, i) => `$${i + 1}`).join(',');
            query += ` WHERE dashboard_id IN (${placeholders})`;
            params.push(...dashIds);
        }

        query += ' ORDER BY id ASC';

        const result = await client.query(query, params);
        const tasks = result.rows.map(row => ({
            ...row,
            id: Number(row.id)
        }));
        client.release();

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, week, name, status, owner, type, prio, gate, due, desc, dashboard_id } = body;

        if (!dashboard_id) return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });

        const client = await pool.connect();

        const query = `
      INSERT INTO tasks (id, week, name, status, owner, type, prio, gate, due, description, dashboard_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        week = EXCLUDED.week,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        owner = EXCLUDED.owner,
        type = EXCLUDED.type,
        prio = EXCLUDED.prio,
        gate = EXCLUDED.gate,
        due = EXCLUDED.due,
        description = EXCLUDED.description,
        dashboard_id = EXCLUDED.dashboard_id
    `;

        await client.query(query, [id, week, name, status, owner, type, prio, gate, due, desc, dashboard_id]);
        client.release();

        return NextResponse.json({ message: 'Task saved' }, { status: 201 });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const client = await pool.connect();
        await client.query('DELETE FROM tasks WHERE id = $1', [id]);
        client.release();

        return NextResponse.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
