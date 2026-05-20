import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, login } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { unauthorized, serverError } from '@/lib/api-error';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) {
        return unauthorized('No autorizado');
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

            // LOG ACTION
            await logAction(session.id, 'VIEW_POLICY', 'Usuario visualizó la política de privacidad', session.id, client);

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('View Policy Error:', error);
        return serverError('Error al registrar la visualización');
    }
}
