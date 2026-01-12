import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { preferences } = body;

        if (!preferences) return NextResponse.json({ error: 'Preferences required' }, { status: 400 });

        const client = await pool.connect();
        try {
            // Get current preferences
            const currentRes = await client.query('SELECT preferences FROM users WHERE id = $1', [session.id]);
            const currentPrefs = currentRes.rows[0]?.preferences || {};

            // Merge preferences
            const newPrefs = { ...currentPrefs, ...preferences };

            const result = await client.query(
                'UPDATE users SET preferences = $1 WHERE id = $2 RETURNING preferences',
                [JSON.stringify(newPrefs), session.id]
            );

            return NextResponse.json(result.rows[0]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Preferences Update Error", error);
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }
}
