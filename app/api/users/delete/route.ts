import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getSession } from '@/lib/auth';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Complete implementation
export async function DELETE(req: NextRequest) {
    try {
        const user = await getSession();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Remove from collaborations (folders)
            await client.query('DELETE FROM folder_collaborators WHERE user_id = $1', [user.id]);

            // 2. Remove from collaborations (dashboards)
            await client.query('DELETE FROM dashboard_user_permissions WHERE user_id = $1', [user.id]);

            // 3. Remove assignee references (optional: set NULL or delete)
            // Assuming we want to keep history but remove the user link
            await client.query('UPDATE task_assignees SET user_id = NULL WHERE user_id = $1', [user.id]);

            // 4. Delete Owned Dashboards (and their tasks first to be safe against missing cascade)
            // Delete tasks in owned dashboards
            await client.query(`
                DELETE FROM tasks 
                WHERE dashboard_id IN (SELECT id FROM dashboards WHERE owner_id = $1)
            `, [user.id]);

            // Delete owned dashboards
            await client.query('DELETE FROM dashboards WHERE owner_id = $1', [user.id]);

            // 5. Delete Owned Folders
            // (Note: Sub-folders or dashboards inside these folders might need handling if structure is complex,
            // but usually setting parent_id to null or cascading is handled. 
            // Here we just delete the folder. Dashboards inside might get orphaned if not cascaded, 
            // but since we deleted owned dashboards, only shared ones might remain.
            // Let's assume standard behavior: delete the folder.)
            await client.query('DELETE FROM folders WHERE owner_id = $1', [user.id]);

            // 6. Delete User
            await client.query('DELETE FROM users WHERE id = $1', [user.id]);

            await client.query('COMMIT');

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
