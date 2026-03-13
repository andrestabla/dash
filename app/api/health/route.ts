import { NextResponse } from 'next/server';

import pool from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await pool.query('SELECT 1 AS ok');

        return NextResponse.json(
            {
                status: 'ok',
                database: result.rows[0]?.ok === 1 ? 'reachable' : 'unknown',
                timestamp: new Date().toISOString(),
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            }
        );
    } catch (error) {
        const isDev = process.env.NODE_ENV !== 'production';

        return NextResponse.json(
            {
                status: 'error',
                database: 'unreachable',
                error: isDev && error instanceof Error ? error.message : undefined,
                timestamp: new Date().toISOString(),
            },
            {
                status: 503,
                headers: {
                    'Cache-Control': 'no-store',
                },
            }
        );
    }
}
