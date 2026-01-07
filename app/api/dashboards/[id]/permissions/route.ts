import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();

    // This endpoint is called by the admin panel, so we just need to verify the user is authenticated
    // The admin panel itself is protected by admin-only routes
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const client = await pool.connect();

        // Get all users who have permission to this dashboard
        const permissionsRes = await client.query(`
            SELECT 
                dup.user_id,
                dup.role,
                dup.created_at,
                u.email as user_email,
                u.name as user_name
            FROM dashboard_user_permissions dup
            JOIN users u ON dup.user_id = u.id
            WHERE dup.dashboard_id = $1
            ORDER BY u.name, u.email
        `, [id]);

        client.release();

        return NextResponse.json({
            permissions: permissionsRes.rows
        });
    } catch (error) {
        console.error('Error fetching dashboard permissions:', error);
        return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }
}
