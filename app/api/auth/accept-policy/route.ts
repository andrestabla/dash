import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, login } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { accepted } = body;

        if (accepted !== true) {
            return NextResponse.json({ error: 'Debes aceptar la política' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Update user in database
            const result = await client.query(
                `UPDATE users 
                 SET accepted_privacy_policy = TRUE, 
                     privacy_policy_accepted_at = NOW() 
                 WHERE id = $1 
                 RETURNING id, email, name, role, accepted_privacy_policy`,
                [session.id]
            );

            if (result.rows.length === 0) {
                return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
            }

            const updatedUser = result.rows[0];

            // Refresh Session Cookie with updated policy status
            await login({
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                accepted_privacy_policy: updatedUser.accepted_privacy_policy
            });

            // LOG ACTION
            await logAction(session.id, 'ACCEPT_POLICY', 'Usuario aceptó la política de privacidad y tratamiento de datos', session.id, client);

            return NextResponse.json({
                success: true,
                user: updatedUser
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Accept Policy Error:', error);
        return NextResponse.json({
            error: 'Error al procesar la solicitud',
            detail: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
