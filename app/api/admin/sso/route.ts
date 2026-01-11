import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

const verifyAdmin = async () => {
    const session = await getSession();
    return session?.role === 'admin';
};

export async function GET() {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const client = await pool.connect();
        const settingsRes = await client.query("SELECT key, value FROM system_settings WHERE key LIKE 'sso_%'");

        const settings: Record<string, string> = {};
        settingsRes.rows.forEach(row => {
            if (row.key === 'sso_client_secret') {
                settings[row.key] = row.value ? '********' : '';
            } else {
                settings[row.key] = row.value;
            }
        });

        client.release();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to fetch SSO settings:', error);
        return NextResponse.json({ error: 'Failed to fetch SSO settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const { platform, clientId, clientSecret, authority, enabled } = body;

        const client = await pool.connect();

        const ssoSettings = [
            { key: 'sso_platform', value: platform },
            { key: 'sso_client_id', value: clientId },
            { key: 'sso_client_secret', value: clientSecret },
            { key: 'sso_authority', value: authority || '' },
            { key: 'sso_enabled', value: enabled ? 'true' : 'false' }
        ];

        for (const setting of ssoSettings) {
            await client.query(
                `INSERT INTO system_settings (key, value) VALUES ($1, $2) 
                 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [setting.key, setting.value]
            );
        }

        client.release();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save SSO settings:', error);
        return NextResponse.json({ error: 'Failed to save SSO settings' }, { status: 500 });
    }
}
