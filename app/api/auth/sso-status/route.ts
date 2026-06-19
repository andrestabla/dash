import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const client = await pool.connect();
        try {
            const settingsRes = await client.query(
                "SELECT key, value FROM system_settings WHERE key IN ('sso_enabled', 'sso_platform')"
            );

            const settings: Record<string, string> = {};
            settingsRes.rows.forEach(row => {
                settings[row.key] = row.value;
            });

            return NextResponse.json({
                enabled: settings['sso_enabled'] === 'true',
                platform: settings['sso_platform'] || null
            }, {
                // SSO config rarely changes. Letting the browser hold the
                // response for a few minutes saves a cold-start hit on every
                // visit to /login.
                headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to fetch SSO status:', error);
        return NextResponse.json({ enabled: false }, { status: 500 });
    }
}
