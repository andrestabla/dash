import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

// Ensure only admins access this
const verifyAdmin = async () => {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return false;
    }
    return true;
};

export async function GET() {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
        client.release();
        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const { email, password, role } = body;

        if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const hashed = await bcrypt.hash(password, 10);

        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
            [email, hashed, role || 'user']
        );
        client.release();

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const client = await pool.connect();
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        client.release();

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
