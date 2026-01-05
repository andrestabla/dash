import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [session.userId]);

    if (result.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
}

export async function PUT(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, password } = await req.json();

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET name = $1, password_hash = $2 WHERE id = $3', [name, hashedPassword, session.userId]);
    } else {
        await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, session.userId]);
    }

    return NextResponse.json({ success: true });
}
