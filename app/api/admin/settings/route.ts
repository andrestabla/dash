import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { forbidden, serverError } from '@/lib/api-error';

const verifyAdmin = async () => {
    const session = await getSession();
    return session?.role === 'admin';
};

export async function GET() {
    if (!await verifyAdmin()) return forbidden();

    try {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT key, value, description FROM system_settings');

            // Transform user-friendly object
            const settings: any = {};
            res.rows.forEach(r => settings[r.key] = r.value);

            return NextResponse.json(settings);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[AdminSettings] GET error:', error);
        return serverError('Failed');
    }
}

export async function POST(request: Request) {
    if (!await verifyAdmin()) return forbidden();

    try {
        const body = await request.json();
        const client = await pool.connect();
        try {
            for (const [key, value] of Object.entries(body)) {
                await client.query(
                    `INSERT INTO system_settings (key, value) VALUES ($1, $2)
                     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                    [key, value]
                );
            }

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[AdminSettings] POST error:', error);
        return serverError('Failed');
    }
}
