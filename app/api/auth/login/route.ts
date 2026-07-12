import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { badRequest, unauthorized, forbidden, rateLimited, serverError } from '@/lib/api-error';
import { ecosystemAccessAllowed } from '@/lib/ecosystem-access';

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    try {
        const body = await request.json();
        const { email, password } = body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail || !password) {
            return badRequest('Email and password required');
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
                return rateLimited('Demasiados intentos. Intenta de nuevo en unos minutos.');
            }

            const result = await client.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
            const user = result.rows[0];

            if (!user) {
                await client.query(
                    'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                    [ip, normalizedEmail]
                );
                return unauthorized('Credenciales inválidas');
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                await client.query(
                    'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                    [ip, normalizedEmail]
                );
                return unauthorized('Credenciales inválidas');
            }

            // Check Account Status
            if (user.status?.toLowerCase() !== 'active') {
                return forbidden('Tu cuenta no está activa');
            }

            // Gate del Ecosistema (acceso administrado por correo desde Algoritmo T).
            const gate = await ecosystemAccessAllowed(user.email);
            if (gate.enforced && !gate.allowed) {
                await client.query(
                    'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                    [ip, normalizedEmail]
                );
                return forbidden('Tu cuenta no tiene acceso a esta plataforma. Solicítalo al administrador del Ecosistema Algoritmo T.');
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
        return serverError('Error del servidor');
    }
}
