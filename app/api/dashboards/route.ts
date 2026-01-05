import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM dashboards ORDER BY created_at DESC');
        client.release();
        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, settings } = body;

        if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO dashboards (name, description, settings) VALUES ($1, $2, $3) RETURNING *',
            [name, description || '', settings || {}]
        );
        client.release();

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
    }
}
