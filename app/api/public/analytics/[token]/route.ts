import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { badRequest, notFound, serverError } from '@/lib/api-error';

export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    const { token } = params;

    if (!token) return badRequest('Token required');

    try {
        const client = await pool.connect();
        try {

            // 1. Resolve token → folder + the owner-curated exclusion list.
            const folderRes = await client.query(
                `SELECT id, name, is_public,
                        COALESCE(analytics_excluded_dashboard_ids, '{}'::uuid[]) AS excluded
                   FROM folders WHERE public_token = $1`,
                [token]
            );

            if (folderRes.rows.length === 0 || !folderRes.rows[0].is_public) {
                return notFound('Not found or not public');
            }

            const folder = folderRes.rows[0];
            const folderId = folder.id;
            const excluded: string[] = Array.isArray(folder.excluded) ? folder.excluded : [];

            // 2. Recursive fetch of the dashboards that live inside the folder
            //    subtree, MINUS any dashboard the owner unticked in the analytics
            //    view. Each row carries the public-share metadata so the viewer
            //    can jump straight to a board's own public version.
            const dashboardsQuery = `
                WITH RECURSIVE folder_tree AS (
                    SELECT id FROM folders WHERE id = $1
                    UNION ALL
                    SELECT f.id FROM folders f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                )
                SELECT
                    d.id, d.name, d.is_public, d.public_token,
                    u.name AS owner_name
                FROM dashboards d
                LEFT JOIN users u ON d.owner_id = u.id
                WHERE d.folder_id IN (SELECT id FROM folder_tree)
                  AND d.deleted_at IS NULL
                  AND d.id <> ALL($2::uuid[]);
            `;

            // 3. Recursive fetch of tasks belonging to those same dashboards.
            const tasksQuery = `
                WITH RECURSIVE folder_tree AS (
                    SELECT id FROM folders WHERE id = $1
                    UNION ALL
                    SELECT f.id FROM folders f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                )
                SELECT
                    t.id, t.name, t.status, t.prio, t.owner, t.type,
                    d.id as dashboard_id, d.name as dashboard_name,
                    d.settings as dashboard_settings
                FROM tasks t
                JOIN dashboards d ON t.dashboard_id = d.id
                WHERE d.folder_id IN (SELECT id FROM folder_tree)
                  AND d.deleted_at IS NULL
                  AND d.id <> ALL($2::uuid[]);
            `;

            const [dashboardsRes, tasksRes] = await Promise.all([
                client.query(dashboardsQuery, [folderId, excluded]),
                client.query(tasksQuery, [folderId, excluded]),
            ]);

            // 4. Attach every assignee to each task so the public analytics mirror
            //    the private view (workload + responsables filter use assignees).
            const tasks = tasksRes.rows;
            const taskIds = tasks.map((t: any) => t.id);
            if (taskIds.length > 0) {
                const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
                const assigneesRes = await client.query(
                    `SELECT task_id, name FROM task_assignees WHERE task_id IN (${placeholders})`,
                    taskIds
                );
                const assigneesMap: Record<string, { name: string }[]> = {};
                assigneesRes.rows.forEach((row: any) => {
                    if (!assigneesMap[row.task_id]) assigneesMap[row.task_id] = [];
                    assigneesMap[row.task_id].push({ name: row.name });
                });
                tasks.forEach((t: any) => {
                    t.assignees = assigneesMap[t.id] || [];
                    // Legacy fallback when a task predates the assignees table.
                    if (t.assignees.length === 0 && t.owner) {
                        t.assignees = [{ name: t.owner }];
                    }
                });
            }

            return NextResponse.json({
                folderName: folder.name,
                dashboards: dashboardsRes.rows,
                tasks: tasks
            });
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Public Analytics API Error:", error);
        return serverError();
    }
}
