import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { forbidden, badRequest, serverError } from '@/lib/api-error';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return forbidden();
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return badRequest('User ID required');
        }

        const client = await pool.connect();

        // Fetch logs and join with users to get the name of who performed the action
        const result = await client.query(`
            SELECT 
                al.id, 
                al.action, 
                al.details, 
                al.created_at,
                u.email as performed_by_email,
                u.name as performed_by_name
            FROM audit_logs al
            LEFT JOIN users u ON al.performed_by = u.id
            WHERE al.user_id = $1
            ORDER BY al.created_at DESC
        `, [userId]);

        client.release();
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Error fetching logs:", error);
        return serverError('Failed to fetch logs');
    }
}
