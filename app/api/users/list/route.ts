import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const client = await pool.connect();
        // Return minimal user data for selection
        const result = await client.query('SELECT id, email, name FROM users WHERE status = \'active\' ORDER BY name ASC');
        client.release();
        return NextResponse.json(result.rows);


    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
