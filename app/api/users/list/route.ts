import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-error';

export async function GET() {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const client = await pool.connect();
        // Return minimal user data for selection
        const result = await client.query('SELECT id, email, name FROM users WHERE status = \'active\' ORDER BY name ASC');
        client.release();
        return NextResponse.json(result.rows);


    } catch (error) {
        console.error('User list fetch error:', error);
        return serverError('Failed to fetch users');
    }
}
