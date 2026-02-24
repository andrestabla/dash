import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
                   LEFT JOIN folder_collaborators fc ON d.folder_id = fc.folder_id
                   WHERE d.id = $1 AND (d.owner_id = $2 OR dc.user_id = $2 OR fc.user_id = $2)`;

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
                    LEFT JOIN folder_collaborators fc ON d.folder_id = fc.folder_id
                    WHERE d.folder_id IN (SELECT id FROM subfolders) 
                    AND (d.owner_id = $2 OR dc.user_id = $2 OR fc.user_id = $2)
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
                   LEFT JOIN folder_collaborators fc ON d.folder_id = fc.folder_id
                   WHERE d.owner_id = $1 OR dc.user_id = $1 OR fc.user_id = $1
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
            id: row.id
        }));

        // Fetch assignees for these tasks
        const taskIds = tasks.map(t => t.id);
        if (taskIds.length > 0) {
            const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
            const assigneesRes = await client.query(
                `SELECT task_id, name, user_id FROM task_assignees WHERE task_id IN (${placeholders})`,
                taskIds
            );

            const assigneesMap: Record<string, any[]> = {};
            assigneesRes.rows.forEach(row => {
                if (!assigneesMap[row.task_id]) assigneesMap[row.task_id] = [];
                assigneesMap[row.task_id].push({ name: row.name, id: row.user_id });
            });

            tasks.forEach((t: any) => {
                t.assignees = assigneesMap[t.id] || [];
                // Fallback for legacy owner if no assignees in table
                if (t.assignees.length === 0 && t.owner) {
                    t.assignees = [{ name: t.owner }];
                }
            });
        }

        client.release();

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, week, name, status, owner, type, prio, gate, due, desc, dashboard_id, assignees } = body;

        if (!dashboard_id) return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });

        const client = await pool.connect();

        // Check Permission
        const accessQuery = session.role === 'admin'
            ? 'SELECT id FROM dashboards WHERE id = $1'
            : `SELECT d.id FROM dashboards d 
               LEFT JOIN dashboard_collaborators dc ON d.id = dc.dashboard_id 
               LEFT JOIN folder_collaborators fc ON d.folder_id = fc.folder_id
               WHERE d.id = $1 AND (d.owner_id = $2 OR dc.user_id = $2 OR fc.user_id = $2)`;

        const accessParams = session.role === 'admin' ? [dashboard_id] : [dashboard_id, session.id];
        const accessCheck = await client.query(accessQuery, accessParams);

        if (accessCheck.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        try {
            await client.query('BEGIN');

            // Determine primary owner for legacy support
            let primaryOwner = owner;
            if (assignees && Array.isArray(assignees) && assignees.length > 0) {
                primaryOwner = typeof assignees[0] === 'string' ? assignees[0] : assignees[0].name;
            }

            // Detect if this is an update (valid UUID) or a create (new / Date.now() style ID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isValidUUID = id && uuidRegex.test(String(id));

            let savedTaskId: string;

            if (isValidUUID) {
                // UPDATE: upsert by UUID
                const upsertQuery = `
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
                  RETURNING id
                `;
                const res = await client.query(upsertQuery, [id, week, name, status, primaryOwner, type, prio, gate, due, desc, dashboard_id]);
                savedTaskId = res.rows[0].id;
            } else {
                // CREATE: let the DB generate a proper UUID
                const insertQuery = `
                  INSERT INTO tasks (week, name, status, owner, type, prio, gate, due, description, dashboard_id)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                  RETURNING id
                `;
                const res = await client.query(insertQuery, [week, name, status, primaryOwner, type, prio, gate, due, desc, dashboard_id]);
                savedTaskId = res.rows[0].id;
            }

            // Handle Assignees
            if (assignees && Array.isArray(assignees)) {
                // Delete existing
                await client.query('DELETE FROM task_assignees WHERE task_id = $1', [savedTaskId]);

                // Insert new
                for (const assignee of assignees) {
                    const assigneeName = typeof assignee === 'string' ? assignee : assignee.name;
                    const assigneeId = (typeof assignee === 'object' && assignee.id) ? assignee.id : null;

                    if (assigneeName) {
                        await client.query(
                            'INSERT INTO task_assignees (task_id, name, user_id) VALUES ($1, $2, $3) ON CONFLICT (task_id, name) DO NOTHING',
                            [savedTaskId, assigneeName, assigneeId]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            client.release();

            return NextResponse.json({ message: 'Task saved', id: savedTaskId }, { status: 201 });
        } catch (dbError) {
            await client.query('ROLLBACK');
            client.release();
            console.error('Database Transaction Error:', dbError);
            return NextResponse.json({ error: 'Failed to save task data' }, { status: 500 });
        }
    } catch (error) {
        console.error('Request Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const client = await pool.connect();

        // To delete, we need to know the dashboard_id of the task
        const taskRes = await client.query('SELECT dashboard_id FROM tasks WHERE id = $1', [id]);
        if (taskRes.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        const dashboardId = taskRes.rows[0].dashboard_id;

        // Check Permission
        const accessQuery = session.role === 'admin'
            ? 'SELECT id FROM dashboards WHERE id = $1'
            : `SELECT d.id FROM dashboards d 
               LEFT JOIN dashboard_collaborators dc ON d.id = dc.dashboard_id 
               LEFT JOIN folder_collaborators fc ON d.folder_id = fc.folder_id
               WHERE d.id = $1 AND (d.owner_id = $2 OR dc.user_id = $2 OR fc.user_id = $2)`;

        const accessParams = session.role === 'admin' ? [dashboardId] : [dashboardId, session.id];
        const accessCheck = await client.query(accessQuery, accessParams);

        if (accessCheck.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        await client.query('DELETE FROM tasks WHERE id = $1', [id]);
        client.release();

        return NextResponse.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
