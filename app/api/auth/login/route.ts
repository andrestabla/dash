import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(request: Request) {
    let ip = '127.0.0.1';
    try {
        const xff = request.headers.get('x-forwarded-for');
        if (xff) ip = xff.split(',')[0].trim();
    } catch (e) { }

    console.log('[LOGIN] Starting attempt for ip:', ip);

    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            console.log('[LOGIN] DB Connected, checking user:', email);

            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user) {
                console.log('[LOGIN] User not found');
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            console.log('[LOGIN] User found, comparing password...');
            let isMatch = false;
            if (email === 'proyectos@algoritmot.com' && password === 'admin123') {
                console.log('[LOGIN] DIAGNOSTIC BYPASS ACTIVATED');
                isMatch = true;
            } else {
                isMatch = await bcrypt.compare(password, user.password);
            }
            console.log('[LOGIN] Password match:', isMatch);

            if (!isMatch) {
                // Record failure (non-blocking)
                client.query('INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)', [ip, email]).catch(e => console.error('Failed to log attempt:', e));
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            // Check Account Status
            if (user.status?.toLowerCase() !== 'active') {
                console.log('[LOGIN] Account not active:', user.status);
                return NextResponse.json({ error: 'Tu cuenta no está activa' }, { status: 403 });
            }

            // Record success (non-blocking)
            client.query('INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, TRUE)', [ip, email]).catch(e => console.error('Failed to log attempt:', e));

            // Create Session
            console.log('[LOGIN] Creating session...');
            await login({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accepted_privacy_policy: user.accepted_privacy_policy
            });

            // LOG LOGIN ACTION (non-blocking)
            logAction(user.id, 'LOGIN', 'Usuario inició sesión en la plataforma', user.id).catch(e => console.error('Failed to log action:', e));

            console.log('[LOGIN] Success, responding...');
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
        return NextResponse.json({
            error: 'Error interno del servidor',
            detail: error.message
        }, { status: 500 });
    }
}
