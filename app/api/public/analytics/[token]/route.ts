import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    const { token } = params;

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    try {
        const client = await pool.connect();

        // 1. Resolve Token to Folder ID
        const folderRes = await client.query('SELECT id, name, is_public FROM folders WHERE public_token = $1', [token]);

        if (folderRes.rows.length === 0 || !folderRes.rows[0].is_public) {
            client.release();
            return NextResponse.json({ error: 'Not found or not public' }, { status: 404 });
        }

        const folder = folderRes.rows[0];
        const folderId = folder.id;

        // 2. Recursive Fetch (Same logic as /api/tasks but without user session checks)
        // We only fetch tasks for dashboards within the public folder tree.

        const query = `
            WITH RECURSIVE folder_tree AS (
                -- Base case: the shared folder
                SELECT id 
                FROM folders 
                WHERE id = $1
                UNION ALL
                -- Recursive step: subfolders
                SELECT f.id 
                FROM folders f
                INNER JOIN folder_tree ft ON f.parent_id = ft.id
            )
            SELECT 
                t.id, t.name, t.status, t.prio, t.owner, 
                d.id as dashboard_id, d.name as dashboard_name
            FROM tasks t
            JOIN dashboards d ON t.dashboard_id = d.id
            WHERE d.folder_id IN (SELECT id FROM folder_tree)
            AND d.deleted_at IS NULL;
        `;

        const tasksRes = await client.query(query, [folderId]);

        client.release();
        return NextResponse.json({
            folderName: folder.name,
            tasks: tasksRes.rows
        });

    } catch (error) {
        console.error("Public Analytics API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
