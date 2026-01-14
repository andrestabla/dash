import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession() as any;
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = await pool.connect();
        // Join with users to see who sent it
        const res = await client.query(`
            SELECT t.*, u.name as user_name, u.email as user_email 
            FROM support_tickets t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `);
        client.release();
        return NextResponse.json(res.rows);
    } catch (errors) {
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await getSession() as any;
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id, status } = await request.json();
        const client = await pool.connect();
        await client.query("UPDATE support_tickets SET status = $1 WHERE id = $2", [status, id]);
        client.release();
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
