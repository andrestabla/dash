import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

const verifyAdmin = async () => {
    const session = await getSession();
    return session?.role === 'admin';
};

export async function GET() {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const client = await pool.connect();
        const res = await client.query('SELECT key, value, description FROM system_settings');
        client.release();

        // Transform user-friendly object
        const settings: any = {};
        res.rows.forEach(r => settings[r.key] = r.value);

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const client = await pool.connect();

        for (const [key, value] of Object.entries(body)) {
            await client.query(
                `INSERT INTO system_settings (key, value) VALUES ($1, $2) 
                 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [key, value]
            );
        }

        client.release();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
