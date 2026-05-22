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

            // 1. Validate Token & Get Dashboard ID
            const dashRes = await client.query(`
                SELECT id, name, settings, folder_id
                FROM dashboards
                WHERE public_token = $1 AND is_public = TRUE
            `, [token]);

            if (dashRes.rows.length === 0) {
                return notFound('Dashboard not found or private');
            }

            const dashboard = dashRes.rows[0];

            // 2. Fetch Tasks. Column list and ordering mirror /api/tasks so the
            //    public viewer receives `desc` (aliased from `description`) and
            //    shows tasks in the same manual per-column order (`position`)
            //    as the real board.
            const tasksRes = await client.query(`
                SELECT id, week, name, status, owner, type, prio, gate, due,
                       description as desc, dashboard_id, position
                FROM tasks WHERE dashboard_id = $1 ORDER BY position ASC, id ASC
            `, [dashboard.id]);

            // 3. Fetch Comments for these tasks
            const commentsRes = await client.query(`
                SELECT * FROM task_comments
                WHERE task_id IN (SELECT id FROM tasks WHERE dashboard_id = $1)
                ORDER BY created_at ASC
            `, [dashboard.id]);

            return NextResponse.json({
                dashboard: dashboard,
                tasks: tasksRes.rows,
                comments: commentsRes.rows
            });
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Public API Error:", error);
        return serverError();
    }
}
