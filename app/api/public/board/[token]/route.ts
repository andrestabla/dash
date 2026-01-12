import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    const { token } = params;

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    try {
        const client = await pool.connect();

        // 1. Validate Token & Get Dashboard ID
        const dashRes = await client.query(`
            SELECT id, name, settings, folder_id 
            FROM dashboards 
            WHERE public_token = $1 AND is_public = TRUE
        `, [token]);

        if (dashRes.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Dashboard not found or private' }, { status: 404 });
        }

        const dashboard = dashRes.rows[0];

        // 2. Fetch Tasks (Reusing logic from tasks API but simplified for read-only)
        const tasksRes = await client.query(`
            SELECT * FROM tasks WHERE dashboard_id = $1 ORDER BY created_at DESC
        `, [dashboard.id]);

        // 3. Fetch Comments for these tasks
        const commentsRes = await client.query(`
            SELECT * FROM comments 
            WHERE task_id IN (SELECT id FROM tasks WHERE dashboard_id = $1)
            ORDER BY created_at ASC
        `, [dashboard.id]);

        client.release();

        return NextResponse.json({
            dashboard: dashboard,
            tasks: tasksRes.rows,
            comments: commentsRes.rows
        });

    } catch (error) {
        console.error("Public API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
