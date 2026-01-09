import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const client = await pool.connect();
        const ssoEnabled = await client.query("SELECT value FROM system_settings WHERE key = 'sso_enabled'");
        const platform = await client.query("SELECT value FROM system_settings WHERE key = 'sso_platform'");
        client.release();

        if (!ssoEnabled.rows[0] || ssoEnabled.rows[0].value !== 'true') {
            return NextResponse.redirect(new URL('/login?error=SSO_DISABLED', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
        }

        // Simulating redirect to Identity Provider (Google, Microsoft, etc.)
        // In a real app, you'd build the authorization URL here.
        // For this demo, we'll redirect to our callback directly with a mock "code"
        const callbackUrl = new URL('/api/auth/callback/sso', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
        callbackUrl.searchParams.set('code', 'mock_sso_code_valid');
        callbackUrl.searchParams.set('state', 'random_state_string');

        return NextResponse.redirect(callbackUrl);
    } catch (error) {
        console.error('SSO Redirect Error:', error);
        return NextResponse.redirect(new URL('/login?error=SSO_FAILED', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }
}
