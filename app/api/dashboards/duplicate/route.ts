import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, badRequest, notFound, forbidden, serverError } from '@/lib/api-error';
import { gestorClause } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { dashboardId, name } = body; // Optional new name

        if (!dashboardId) return badRequest('Dashboard ID required');

        const client = await pool.connect();
        try {
            // 1. Get original dashboard
            const originalRes = await client.query('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
            if (originalRes.rows.length === 0) {
                return notFound('Dashboard not found');
            }
            const original = originalRes.rows[0];

            // Verify the caller may access the dashboard being duplicated.
            if (session.role !== 'admin') {
                const accessRes = await client.query(
                    `SELECT 1 FROM dashboards d
                     WHERE d.id = $1 AND (
                         d.owner_id = $2 OR
                         EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2) OR
                         EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2) OR
                         ${gestorClause('d', '$2')}
                     )`,
                    [dashboardId, session.id]
                );
                if (accessRes.rows.length === 0) {
                    return forbidden('Access denied');
                }
            }

            // 2. Determine new name
            const newName = name || `${original.name} (Copia)`;

            // The copy always lands in the same folder as the source — that's
            // where the user expects to find it after duplicating. Access to
            // the source already implies access to its folder (verified above),
            // so this never sneaks a dashboard into a folder the caller cannot
            // see.
            const copyFolderId = original.folder_id;

            // Wrap everything in a transaction so a partially-cloned dashboard
            // never lingers in the DB if any insert downstream fails.
            try {
                await client.query('BEGIN');

                // 3. Insert dashboard copy. `settings` (which holds the canvas
                //    document, dashboardType and view config) is copied
                //    verbatim — canvases keep all nodes, edges and inline
                //    comments because they live inside that JSON blob.
                const dashRes = await client.query(
                    `INSERT INTO dashboards (name, description, settings, folder_id, owner_id, start_date, end_date, is_demo, workspace_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING *`,
                    [newName, original.description, original.settings, copyFolderId, session.id, original.start_date, original.end_date, false, original.workspace_id]
                );
                const newDashboard = dashRes.rows[0];

                // 4. Clone tasks (Kanban data). Skip soft-deleted rows and
                //    preserve every column that affects UX: manual order via
                //    `position`, notification settings, etc.
                const tasksRes = await client.query(
                    `SELECT id, name, status, prio, owner, type, week, gate, description, due,
                            position, notification_enabled, notification_value, notification_unit
                     FROM tasks
                     WHERE dashboard_id = $1 AND deleted_at IS NULL
                     ORDER BY position ASC, created_at ASC`,
                    [dashboardId]
                );

                // Track old → new task IDs so child tables (assignees,
                // comments) can be rewired to the new dashboard.
                const idMap = new Map<string, string>();
                for (const task of tasksRes.rows) {
                    const newId = crypto.randomUUID();
                    idMap.set(task.id, newId);
                    await client.query(
                        `INSERT INTO tasks (
                            id, name, status, prio, owner, type, week, gate,
                            dashboard_id, description, due, position,
                            notification_enabled, notification_value, notification_unit, notification_sent
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8,
                            $9, $10, $11, $12,
                            $13, $14, $15, false
                        )`,
                        [
                            newId, task.name, task.status, task.prio, task.owner, task.type, task.week, task.gate,
                            newDashboard.id, task.description, task.due, task.position ?? 0,
                            task.notification_enabled ?? false, task.notification_value, task.notification_unit
                        ]
                    );
                }

                // 5. Clone task_assignees and task_comments in bulk so multi-
                //    assignee tasks and prior discussion survive the copy.
                if (idMap.size > 0) {
                    const oldIds = Array.from(idMap.keys());

                    const assigneesRes = await client.query(
                        `SELECT task_id, user_id, name FROM task_assignees WHERE task_id = ANY($1::uuid[])`,
                        [oldIds]
                    );
                    for (const a of assigneesRes.rows) {
                        const newTaskId = idMap.get(a.task_id);
                        if (!newTaskId) continue;
                        await client.query(
                            `INSERT INTO task_assignees (task_id, user_id, name) VALUES ($1, $2, $3)`,
                            [newTaskId, a.user_id, a.name]
                        );
                    }

                    const commentsRes = await client.query(
                        `SELECT task_id, user_email, user_name, content, created_at
                         FROM task_comments WHERE task_id = ANY($1::uuid[])`,
                        [oldIds]
                    );
                    for (const c of commentsRes.rows) {
                        const newTaskId = idMap.get(c.task_id);
                        if (!newTaskId) continue;
                        await client.query(
                            `INSERT INTO task_comments (task_id, user_email, user_name, content, created_at)
                             VALUES ($1, $2, $3, $4, $5)`,
                            [newTaskId, c.user_email, c.user_name, c.content, c.created_at]
                        );
                    }
                }

                await client.query('COMMIT');
                return NextResponse.json(newDashboard);
            } catch (txError) {
                await client.query('ROLLBACK');
                throw txError;
            }
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return serverError('Failed to duplicate dashboard');
    }
}
