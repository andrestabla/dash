import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const client = await pool.connect();
        try {
            // Update the viewed_at timestamp ONLY if it's currently null
            await client.query(
                `UPDATE users 
                 SET privacy_policy_viewed_at = COALESCE(privacy_policy_viewed_at, NOW()) 
                 WHERE id = $1`,
                [session.id]
            );

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('View Policy Error:', error);
        return NextResponse.json({ error: 'Error al registrar la visualización' }, { status: 500 });
    }
}
