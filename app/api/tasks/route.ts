import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const client = await pool.connect();
        // Example query - schema not yet created so this might fail if table doesn't exist
        // const result = await client.query('SELECT * FROM tasks');
        // const tasks = result.rows;
        client.release();

        // Return empty for now until DB is set up
        return NextResponse.json([]);
    } catch (error) {
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const client = await pool.connect();
        // await client.query('INSERT INTO tasks ...', [body...]);
        client.release();
        return NextResponse.json({ message: 'Task created' }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
