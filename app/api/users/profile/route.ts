import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hash } from 'bcrypt';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const client = await pool.connect();
        // Assuming 'name' column exists now (after manual SQL)
        const res = await client.query('SELECT email, name, role FROM users WHERE id = $1', [session.user.id]);
        client.release();

        if (res.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error('Profile GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, password } = await request.json();
        const client = await pool.connect();

        if (password && password.trim().length >= 6) {
            const hashedPassword = await hash(password, 10);
            await client.query(
                'UPDATE users SET name = $1, password = $2 WHERE id = $3',
                [name, hashedPassword, session.user.id]
            );
        } else {
            await client.query(
                'UPDATE users SET name = $1 WHERE id = $2',
                [name, session.user.id]
            );
        }

        client.release();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Profile PUT Error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
