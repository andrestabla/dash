import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, logout } from '@/lib/auth';

// Complete implementation
export async function DELETE(req: NextRequest) {
    try {
        const user = await getSession();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1) Remove explicit collaboration links first.
            await client.query('DELETE FROM folder_collaborators WHERE user_id = $1', [user.id]);
            await client.query('DELETE FROM dashboard_user_permissions WHERE user_id = $1', [user.id]);

            // 2) Remove assignee references while keeping task history.
            await client.query('UPDATE task_assignees SET user_id = NULL WHERE user_id = $1', [user.id]);

            // 3) Delete dashboards directly owned by user.
            await client.query('DELETE FROM dashboards WHERE owner_id = $1', [user.id]);

            // 4) Delete all folders owned by user recursively and any dashboards inside them.
            await client.query(`
                WITH RECURSIVE owned_folders AS (
                    SELECT id FROM folders WHERE owner_id = $1
                    UNION ALL
                    SELECT f.id
                    FROM folders f
                    JOIN owned_folders ofd ON f.parent_id = ofd.id
                )
                DELETE FROM dashboards
                WHERE folder_id IN (SELECT id FROM owned_folders)
            `, [user.id]);
            await client.query('DELETE FROM folders WHERE owner_id = $1', [user.id]);

            // 5) Delete user account.
            await client.query('DELETE FROM users WHERE id = $1', [user.id]);

            await client.query('COMMIT');
            await logout();

            return NextResponse.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Delete account error:", e);
            return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Delete account error:", error);
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
}
