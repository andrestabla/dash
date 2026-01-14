import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getSession } from '@/lib/auth';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function DELETE(req: NextRequest) {
    try {
        const user = await getSession();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const client = await pool.connect();
        try {
            // Delete user - cascading should handle related data if set up, 
            // but explicit cleanup is safer if constraints aren't perfect.
            // Assuming standard ON DELETE CASCADE usually.

            await client.query("DELETE FROM users WHERE id = $1", [user.id]);

            // Note: If you have active sessions or cookies, they might persist client-side 
            // until cleared, but the user constraint is gone.

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Delete account error:", error);
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
}
