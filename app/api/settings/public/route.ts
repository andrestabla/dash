import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { serverError } from '@/lib/api-error';

export async function GET() {
    try {
        const client = await pool.connect();
        try {
            // Fetch only safe, public settings
            const res = await client.query(`
                SELECT key, value
                FROM system_settings
                WHERE key IN (
                    'app_name',
                    'brand_logo_url',
                    'brand_favicon_url',
                    'brand_primary_color',
                    'brand_secondary_color',
                    'brand_login_bg'
                )
            `);

            const settings: any = {};
            res.rows.forEach(r => settings[r.key] = r.value);

            return NextResponse.json(settings);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Public Settings Fetch Error:", error);
        return serverError();
    }
}
