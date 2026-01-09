import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { origin } = new URL(request.url);
        const client = await pool.connect();
        const settings: Record<string, string> = {};
        const settingsRes = await client.query("SELECT key, value FROM system_settings WHERE key LIKE 'sso_%'");
        settingsRes.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        client.release();

        if (settings['sso_enabled'] !== 'true') {
            return NextResponse.redirect(new URL(`/login?error=SSO_DISABLED`, origin));
        }

        const platform = settings['sso_platform'];
        const clientId = settings['sso_client_id'];
        const redirectUri = `${origin}/api/auth/callback/sso`;
        const state = Math.random().toString(36).substring(7);

        let authUrl = '';

        if (platform === 'google') {
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
        } else if (platform === 'microsoft') {
            const authority = settings['sso_authority'] || 'https://login.microsoftonline.com/common';
            authUrl = `${authority}/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
        } else {
            // Default/Custom SAML logic could go here
            return NextResponse.redirect(new URL(`/login?error=UNSUPPORTED_PLATFORM`, origin));
        }

        return NextResponse.redirect(new URL(authUrl));
    } catch (error) {
        console.error('SSO Redirect Error:', error);
        const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.redirect(new URL('/login?error=SSO_FAILED', fallbackOrigin));
    }
}
