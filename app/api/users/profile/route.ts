import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { unauthorized, notFound, serverError } from '@/lib/api-error';

export async function GET() {
    const session = await getSession();
    // Valid session IS the payload
    if (!session || !(session as any).id) return unauthorized();

    try {
        const client = await pool.connect();
        try {
            // session is the payload, so we use session.id directly
            const res = await client.query('SELECT email, name, role FROM users WHERE id = $1', [(session as any).id]);

            if (res.rows.length === 0) return notFound('User not found');

            return NextResponse.json(res.rows[0]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Profile GET Error:', error);
        return serverError();
    }
}

export async function PUT(request: Request) {
    const session = await getSession();
    if (!session || !(session as any).id) return unauthorized();

    try {
        const { name, password } = await request.json();
        const client = await pool.connect();
        try {
            if (password && password.trim().length >= 6) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await client.query(
                    'UPDATE users SET name = $1, password = $2 WHERE id = $3',
                    [name, hashedPassword, (session as any).id]
                );
            } else {
                await client.query(
                    'UPDATE users SET name = $1 WHERE id = $2',
                    [name, (session as any).id]
                );
            }

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Profile PUT Error:', error);
        return serverError('Failed to update profile');
    }
}
