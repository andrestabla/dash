import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const revalidate = 0; // Disable caching

export async function GET() {
    try {
        const client = await pool.connect();
        const settingsRes = await client.query(
            "SELECT key, value FROM system_settings WHERE key IN ('sso_enabled', 'sso_platform')"
        );

        const settings: Record<string, string> = {};
        settingsRes.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        client.release();

        return NextResponse.json({
            enabled: settings['sso_enabled'] === 'true',
            platform: settings['sso_platform'] || null
        });
    } catch (error) {
        console.error('Failed to fetch SSO status:', error);
        return NextResponse.json({ enabled: false }, { status: 500 });
    }
}
