import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    try {
        const body = await request.json();
        const { email, password } = body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            // Login rate limiting: protect against brute force and credential stuffing.
            const [ipAttempts, emailAttempts] = await Promise.all([
                client.query(
                    `SELECT COUNT(*) 
                     FROM login_attempts
                     WHERE ip_address = $1
                       AND success = FALSE
                       AND attempted_at > NOW() - INTERVAL '15 minutes'`,
                    [ip]
                ),
                client.query(
                    `SELECT COUNT(*)
                     FROM login_attempts
                     WHERE email = $1
                       AND success = FALSE
                       AND attempted_at > NOW() - INTERVAL '15 minutes'`,
                    [normalizedEmail]
                ),
            ]);

            if (parseInt(ipAttempts.rows[0].count, 10) >= 20 || parseInt(emailAttempts.rows[0].count, 10) >= 8) {
                return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }, { status: 429 });
            }

            const result = await client.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
            const user = result.rows[0];

            if (!user) {
                await client.query(
                    'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                    [ip, normalizedEmail]
                );
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                await client.query(
                    'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                    [ip, normalizedEmail]
                );
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            // Check Account Status
            if (user.status?.toLowerCase() !== 'active') {
                return NextResponse.json({ error: 'Tu cuenta no está activa' }, { status: 403 });
            }

            // Record success
            await client.query(
                'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, TRUE)',
                [ip, normalizedEmail]
            );

            // Create Session
            await login({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accepted_privacy_policy: user.accepted_privacy_policy
            });

            // LOG LOGIN ACTION
            await logAction(user.id, 'LOGIN', 'Usuario inició sesión', user.id, client);

            return NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    accepted_privacy_policy: user.accepted_privacy_policy
                }
            });
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('[LOGIN] Fatal error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
