import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
    // A few seconds of browser-side caching turns rapid internal navigations
    // into zero round trips. `private` keeps the response off any shared CDN.
    const SHORT_CACHE = { 'Cache-Control': 'private, max-age=15' };
    const session = await getSession() as any;
    if (!session) {
        return NextResponse.json({ user: null }, { headers: SHORT_CACHE });
    }

    try {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT id, name, email, role, preferences FROM users WHERE id = $1', [session.id]);

            if (res.rows.length === 0) {
                return NextResponse.json({ user: null }, { headers: SHORT_CACHE });
            }

            return NextResponse.json({ user: res.rows[0] }, { headers: SHORT_CACHE });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Auth Me Error", error);
        return NextResponse.json({ user: session }, { headers: SHORT_CACHE }); // Fallback to session if DB fails
    }
}


