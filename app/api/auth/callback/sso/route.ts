import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=INVALID_SSO_RESPONSE', request.url));
    }

    try {
        // 1. Simulate fetching user info from provider using the code
        // In a real app, you would exchange the code for tokens first.
        const mockSsoUser = {
            email: 'usuario.sso@empresa.com',
            name: 'Colaborador SSO',
            externalId: 'sso_123456789'
        };

        const client = await pool.connect();

        try {
            // 2. Check if user exists
            const userCheck = await client.query('SELECT * FROM users WHERE email = $1', [mockSsoUser.email]);
            let user = userCheck.rows[0];

            if (!user) {
                // 3. AUTO-CREATE USER
                console.log(`Auto-creating user for SSO: ${mockSsoUser.email}`);

                // Use a random secure password as placeholder (wont be used for SSO login)
                const placeholderPassword = await bcrypt.hash(Math.random().toString(36).slice(-12), 10);

                const newUser = await client.query(
                    `INSERT INTO users (email, name, password, role, status, accepted_privacy_policy) 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     RETURNING *`,
                    [mockSsoUser.email, mockSsoUser.name, placeholderPassword, 'user', 'active', true]
                );
                user = newUser.rows[0];

                await logAction(user.id, 'SSO_AUTO_REGISTER', 'Usuario creado automáticamente vía SSO', user.id, client);
            } else {
                // 4. Update existing user metadata if needed and ensure Active
                if (user.status !== 'active') {
                    await client.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user.id]);
                    user.status = 'active';
                }

                // Update name if it changed in SSO provider
                if (user.name !== mockSsoUser.name) {
                    await client.query('UPDATE users SET name = $1 WHERE id = $2', [mockSsoUser.name, user.id]);
                    user.name = mockSsoUser.name;
                }

                await logAction(user.id, 'SSO_LOGIN', 'Inicio de sesión exitoso vía SSO', user.id, client);
            }

            // 5. Create Session
            await login({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accepted_privacy_policy: user.accepted_privacy_policy
            });

            // 6. Redirect to Workspace
            return NextResponse.redirect(new URL('/workspace', request.url));

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('SSO Callback Error:', error);
        return NextResponse.redirect(new URL('/login?error=SSO_SYNC_FAILED', request.url));
    }
}
