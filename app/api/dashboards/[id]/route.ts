import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM dashboards WHERE id = $1', [id]);
        client.release();

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('DB Error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
