import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const client = await pool.connect();
        // Fetch only safe, public settings
        const res = await client.query(`
            SELECT key, value 
            FROM system_settings 
            WHERE key IN (
                'app_name', 
                'brand_logo_url', 
                'brand_favicon_url', 
                'brand_primary_color', 
                'brand_login_bg'
            )
        `);
        client.release();

        const settings: any = {};
        res.rows.forEach(r => settings[r.key] = r.value);

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
