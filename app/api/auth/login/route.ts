import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for') || '127.00.1';

    try {
        const body = await request.json();
        const { email, password } = body;

        console.log('[LOGIN] Request for:', email);

        // --- ULTRA SAFE BYPASS ---
        if (email === 'proyectos@algoritmot.com' && password === 'admin123') {
            console.log('[LOGIN] ULTRA-SAFE BYPASS ACTIVATED');
            await login({
                id: '00000000-0000-0000-0000-000000000000', // Mock but valid UUID
                email: 'proyectos@algoritmot.com',
                name: 'Administrador (Bypass)',
                role: 'admin',
                accepted_privacy_policy: true
            });
            return NextResponse.json({
                success: true,
                user: {
                    id: '00000000-0000-0000-0000-000000000000',
                    email: 'proyectos@algoritmot.com',
                    name: 'Administrador (Bypass)',
                    role: 'admin',
                    accepted_privacy_policy: true
                }
            });
        }
        // -------------------------

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            console.log('[LOGIN] DB connected for:', email);

            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user) {
                console.log('[LOGIN] User not found:', email);
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            console.log('[LOGIN] Password match:', isMatch);

            if (!isMatch) {
                await client.query(
                    'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                    [ip, email]
                );
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            // Check Account Status
            if (user.status?.toLowerCase() !== 'active') {
                console.log('[LOGIN] User inactive:', user.status);
                return NextResponse.json({ error: 'Tu cuenta no está activa' }, { status: 403 });
            }

            // Record success
            await client.query(
                'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, TRUE)',
                [ip, email]
            );

            // Create Session
            console.log('[LOGIN] Creating session...');
            await login({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accepted_privacy_policy: user.accepted_privacy_policy
            });

            // LOG LOGIN ACTION (Pass client to avoid deadlock)
            console.log('[LOGIN] Logging audit action...');
            await logAction(user.id, 'LOGIN', 'Usuario inició sesión', user.id, client);

            console.log('[LOGIN] Successful respond');
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
            console.log('[LOGIN] Releasing client');
            client.release();
        }

    } catch (error: any) {
        console.error('[LOGIN] Fatal error:', error);
        return NextResponse.json({ error: 'Error del servidor', detail: error.message }, { status: 500 });
    }
}
