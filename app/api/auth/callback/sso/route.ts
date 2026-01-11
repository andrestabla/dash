import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import crypto from 'crypto';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=INVALID_SSO_RESPONSE', request.url));
    }

    try {
        const client = await pool.connect();
        const settings: Record<string, string> = {};
        const settingsRes = await client.query("SELECT key, value FROM system_settings WHERE key LIKE 'sso_%'");
        settingsRes.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        if (settings['sso_enabled'] !== 'true') {
            client.release();
            return NextResponse.redirect(new URL('/login?error=SSO_DISABLED', request.url));
        }

        const platform = settings['sso_platform'];
        const clientId = settings['sso_client_id'];
        const clientSecret = settings['sso_client_secret'];
        const redirectUri = `${new URL(request.url).origin}/api/auth/callback/sso`;

        let email = '';
        let name = '';

        if (platform === 'google') {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            });
            const tokens = await tokenRes.json();
            if (!tokens.access_token) throw new Error('Failed to get Google access token');

            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const userData = await userRes.json();
            email = userData.email;
            name = userData.name;
        } else if (platform === 'microsoft') {
            const authority = settings['sso_authority'] || 'https://login.microsoftonline.com/common';
            const tokenRes = await fetch(`${authority}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                    scope: 'openid email profile https://graph.microsoft.com/user.read'
                }),
            });
            const tokens = await tokenRes.json();
            if (!tokens.access_token) throw new Error('Failed to get Microsoft access token');

            const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const userData = await userRes.json();
            email = userData.mail || userData.userPrincipalName;
            name = userData.displayName;
        }

        if (!email) throw new Error('Could not retrieve email from provider');

        const mockSsoUser = { email, name };

        try {
            // 2. Check if user exists
            const userCheck = await client.query('SELECT * FROM users WHERE email = $1', [mockSsoUser.email]);
            let user = userCheck.rows[0];

            if (!user) {
                // 3. AUTO-CREATE USER
                const userId = crypto.randomUUID();
                console.log(`[SSO] Auto-creating user: ${mockSsoUser.email} with ID: ${userId}`);

                // Use a random secure password as placeholder (wont be used for SSO login)
                const placeholderPassword = await bcrypt.hash(Math.random().toString(36).slice(-12), 10);

                try {
                    const newUser = await client.query(
                        `INSERT INTO users (id, email, name, password, role, status, accepted_privacy_policy) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7) 
                         RETURNING *`,
                        [userId, mockSsoUser.email, mockSsoUser.name, placeholderPassword, 'user', 'active', true]
                    );
                    user = newUser.rows[0];
                    await logAction(user.id, 'SSO_AUTO_REGISTER', 'Usuario creado automáticamente vía SSO', user.id, client);
                } catch (dbError: any) {
                    console.error('[SSO] Database error during user creation:', dbError);
                    throw dbError;
                }
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

    } catch (error: any) {
        console.error('SSO Callback Error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.redirect(new URL(`/login?error=SSO_SYNC_FAILED&details=${encodeURIComponent(errorMsg)}`, request.url));
    }
}
