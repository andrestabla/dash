import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
    const session = await getSession() as any;
    if (!session) {
        return NextResponse.json({ user: null });
    }

    try {
        const client = await pool.connect();
        const res = await client.query('SELECT id, name, email, role, preferences FROM users WHERE id = $1', [session.id]);
        client.release();

        if (res.rows.length === 0) {
            return NextResponse.json({ user: null });
        }

        return NextResponse.json({ user: res.rows[0] });
    } catch (error) {
        console.error("Auth Me Error", error);
        return NextResponse.json({ user: session }); // Fallback to session if DB fails
    }
}


