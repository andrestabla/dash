import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            // 1. Check Rate Limiting (5 failures in 15 mins)
            const rateLimitCheck = await client.query(
                `SELECT COUNT(*) FROM login_attempts 
                 WHERE (ip_address = $1 OR email = $2) 
                 AND success = FALSE 
                 AND attempted_at > NOW() - INTERVAL '15 minutes'`,
                [ip, email]
            );

            if (parseInt(rateLimitCheck.rows[0].count) >= 5) {
                return NextResponse.json({
                    error: 'Demasiados intentos',
                    detail: 'Tu cuenta o IP ha sido bloqueada temporalmente. Por favor intenta de nuevo en 15 minutos.'
                }, { status: 429 });
            }

            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user || !(await bcrypt.compare(password, user.password))) {
                // Record failure
                await client.query(
                    'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                    [ip, email]
                );
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            // Check Account Status
            if (user.status === 'pending') {
                return NextResponse.json({
                    error: 'Tu cuenta está pendiente de aprobación',
                    detail: 'Un administrador revisará tu solicitud pronto.'
                }, { status: 403 });
            }

            if (user.status === 'denied') {
                return NextResponse.json({
                    error: 'Tu solicitud ha sido denegada',
                    detail: 'Contacta con soporte si crees que es un error.'
                }, { status: 403 });
            }

            if (user.status !== 'active') {
                return NextResponse.json({ error: 'Tu cuenta no está activa' }, { status: 403 });
            }

            // Record success
            await client.query(
                'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, TRUE)',
                [ip, email]
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
            await logAction(user.id, 'LOGIN', 'Usuario inició sesión en la plataforma', user.id);

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

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: `Login failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
    }
}
