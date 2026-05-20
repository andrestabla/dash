import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-error';

export async function GET() {
    const session = await getSession() as any;
    if (!session) {
        return unauthorized();
    }

    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT id, type, message, status, created_at, updated_at
            FROM support_tickets
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [session.id]);

        client.release();
        return NextResponse.json(res.rows);
    } catch (error) {
        console.error("My tickets error:", error);
        return serverError('DB Error');
    }
}
