import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
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
        const clientId = settings['sso_client_id']?.trim();
        const clientSecret = settings['sso_client_secret']?.trim();
        const redirectUri = `${new URL(request.url).origin}/api/auth/callback/sso`;

        if (!clientId || !clientSecret) {
            throw new Error('Configuración de SSO incompleta (Falta Client ID o Secret)');
        }

        let email = '';
        let name = '';

        if (platform === 'google') {
            console.log(`[SSO] Initiating Google token exchange. Redirect URI: ${redirectUri}`);
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code: code as string,
                    client_id: clientId as string,
                    client_secret: clientSecret as string,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            });

            const tokensText = await tokenRes.text();
            let tokens: any;
            try {
                tokens = JSON.parse(tokensText);
            } catch (e) {
                console.error('[SSO] Google returned non-JSON:', tokensText);
                throw new Error(`Google Server Error (${tokenRes.status}): ${tokensText.substring(0, 100)}`);
            }

            if (!tokens.access_token) {
                console.error('[SSO] Google token error:', tokens);
                throw new Error(tokens.error_description || tokens.error || `Error ${tokenRes.status}: Token rejected`);
            }

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
                // 3. AUTO-CREATE USER as 'pending'
                const userId = crypto.randomUUID();
                const placeholderPassword = await bcrypt.hash(Math.random().toString(36).slice(-12), 10);

                const newUser = await client.query(
                    `INSERT INTO users (id, email, name, password, role, status, accepted_privacy_policy) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     RETURNING *`,
                    [userId, mockSsoUser.email, mockSsoUser.name, placeholderPassword, 'user', 'pending', false]
                );
                user = newUser.rows[0];
                await logAction(user.id, 'SSO_AUTO_REGISTER', 'Usuario registrado vía SSO (Pendiente de aprobación)', user.id, client);

                // Send Notification Emails
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misproyectos.com.co';

                // To User
                const userHtml = `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                        <div style="background: #3b82f6; padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">¡Registro Recibido! 🚀</h1>
                        </div>
                        <div style="padding: 30px; line-height: 1.6;">
                            <p>Hola <b>${user.name}</b>,</p>
                            <p>Tu cuenta ha sido creada exitosamente vía SSO y está <b>pendiente de aprobación</b> por un administrador.</p>
                            <p>Te avisaremos por este medio cuando tu cuenta haya sido activada.</p>
                        </div>
                    </div>
                `;
                await sendEmail(user.email, "Registro Recibido - Project Control", userHtml);

                // To Admins
                const admins = await client.query("SELECT email FROM users WHERE role = 'admin'");
                const adminHtml = `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                        <div style="background: #1e293b; padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Nueva Solicitud SSO 👤</h1>
                        </div>
                        <div style="padding: 30px; line-height: 1.6;">
                            <p>Un nuevo usuario se ha registrado usando ${platform}:</p>
                            <ul style="background: #f8fafc; padding: 20px; border-radius: 8px; list-style: none;">
                                <li><b>Nombre:</b> ${user.name}</li>
                                <li><b>Email:</b> ${user.email}</li>
                            </ul>
                            <p><a href="${appUrl}/admin/users" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Ir a Gestión de Usuarios</a></p>
                        </div>
                    </div>
                `;
                for (const admin of admins.rows) {
                    await sendEmail(admin.email, `Solicitud de Registro SSO: ${user.name}`, adminHtml);
                }

                return NextResponse.redirect(new URL('/login?error=PENDING_APPROVAL', request.url));
            }

            // 4. Check status for existing users
            if (user.status !== 'active') {
                return NextResponse.redirect(new URL('/login?error=PENDING_APPROVAL', request.url));
            }

            // 5. Update name if it changed in SSO provider
            if (user.name !== mockSsoUser.name) {
                await client.query('UPDATE users SET name = $1 WHERE id = $2', [mockSsoUser.name, user.id]);
                user.name = mockSsoUser.name;
            }

            await logAction(user.id, 'SSO_LOGIN', 'Inicio de sesión exitoso vía SSO', user.id, client);

            // 6. Create Session
            await login({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accepted_privacy_policy: user.accepted_privacy_policy
            });

            // 7. Redirect to Workspace
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
