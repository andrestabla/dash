import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { forbidden, serverError } from '@/lib/api-error';

export async function GET() {
    try {
        const session = await getSession() as any;
        if (!session || session.role !== 'admin') {
            return forbidden('Unauthorized');
        }

        const client = await pool.connect();
        try {

            // Get database info
            const dbInfo = await client.query('SELECT current_database(), current_user');

            // Get demo dashboard info
            const demoQuery = await client.query(`
                SELECT id, name, is_public
                FROM dashboards
                WHERE is_demo = TRUE
                LIMIT 1
            `);

            // Get all public dashboards
            const publicQuery = await client.query(`
                SELECT id, name
                FROM dashboards
                WHERE is_public = TRUE
            `);

            return NextResponse.json({
                database: dbInfo.rows[0],
                demo_dashboard: demoQuery.rows[0] || null,
                public_dashboards: publicQuery.rows,
                timestamp: new Date().toISOString()
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("DB Status error:", error);
        return serverError();
    }
}
