import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        client.release();

        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create Session
        await login({ id: user.id, email: user.email, role: user.role });

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
