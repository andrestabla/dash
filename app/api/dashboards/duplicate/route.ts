import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, badRequest, notFound, forbidden, serverError } from '@/lib/api-error';
import { gestorClause } from '@/lib/workspace-access';
import { buildCanvasSettings, getDashboardKind } from '@/lib/canvas';

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

                // 3. Insert the dashboard copy. We hand-roll JSON for the
                //    settings column — passing the raw JS object plus a
                //    `$3::jsonb` cast avoids any chance of pg's parameter
                //    inference dropping the canvas blob, which we suspect of
                //    the "duplicate landed empty" bug users have reported.
                //
                //    `buildCanvasSettings` re-normalises the canvas (preserving
                //    every node, edge and inline comment, just refreshing the
                //    updatedAt and stripping any junk fields) for canvas
                //    boards. For kanban boards it strips the canvas key and
                //    keeps the rest. Either way `settings` lands well-formed.
                const sourceSettings = (original.settings && typeof original.settings === 'object')
                    ? original.settings as Record<string, unknown>
                    : {};
                const isCanvas = getDashboardKind(sourceSettings) === 'canvas';
                // `buildCanvasSettings` no longer synthesises a default canvas
                // from the dashboard name — content travels with the source's
                // own nodes/edges or, if the source had none, the copy lands
                // empty (which is the truthful representation).
                const safeSettings = buildCanvasSettings({
                    ...sourceSettings,
                    dashboardType: isCanvas ? 'canvas' : 'kanban'
                });
                const dashRes = await client.query(
                    `INSERT INTO dashboards (name, description, settings, folder_id, owner_id, start_date, end_date, is_demo, workspace_id)
                     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
                     RETURNING *`,
                    [newName, original.description, JSON.stringify(safeSettings), copyFolderId, session.id, original.start_date, original.end_date, false, original.workspace_id]
                );
                const newDashboard = dashRes.rows[0];

                // Defensive: read the row back and confirm that for a canvas
                // duplicate the canvas content actually landed. If it didn't,
                // the copy is broken — roll back so the user sees a clear
                // error instead of a silently-empty board.
                if (isCanvas) {
                    const sourceNodeCount = Array.isArray((sourceSettings as { canvas?: { nodes?: unknown[] } }).canvas?.nodes)
                        ? (sourceSettings as { canvas: { nodes: unknown[] } }).canvas.nodes.length
                        : 0;
                    const verifyRes = await client.query(
                        `SELECT jsonb_array_length(COALESCE(settings -> 'canvas' -> 'nodes', '[]'::jsonb)) AS n FROM dashboards WHERE id = $1`,
                        [newDashboard.id]
                    );
                    const persisted = Number(verifyRes.rows[0]?.n || 0);
                    if (sourceNodeCount > 0 && persisted === 0) {
                        throw new Error('Canvas duplicate landed with no nodes — aborting');
                    }
                }

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
