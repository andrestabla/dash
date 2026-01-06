import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const body = await request.json();
        const { email, role, notify } = body;

        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

        const client = await pool.connect();

        // 1. Check if folder exists and user has permission (Owner or Admin)
        const folderRes = await client.query('SELECT name, owner_id FROM folders WHERE id = $1', [id]);
        if (folderRes.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        const folder = folderRes.rows[0];
        if (session.role !== 'admin' && folder.owner_id !== session.id) {
            client.release();
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Find target user
        const userRes = await client.query('SELECT id, name FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'User not found in system. They must be registered first.' }, { status: 404 });
        }
        const targetUser = userRes.rows[0];

        // 3. Add to collaborators
        await client.query(
            'INSERT INTO folder_collaborators (folder_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (folder_id, user_id) DO UPDATE SET role = EXCLUDED.role',
            [id, targetUser.id, role || 'viewer']
        );

        client.release();

        // 4. Send Notification if requested
        if (notify) {
            const subject = `Invitación a carpeta compartida: ${folder.name}`;
            const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/workspace`;

            const html = `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #3b82f6;">📁 Carpeta Compartida</h2>
                    <p>Hola,</p>
                    <p>Has recibido acceso a la carpeta <b>"${folder.name}"</b> en Mis Proyectos.</p>
                    <p>Ahora puedes ver los tableros y contenido dentro de esta carpeta desde tu espacio de trabajo.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${link}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Acceder al Workspace
                        </a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;"/>
                    <p style="font-size: 12px; color: #999;">Este es un mensaje automático del sistema de Notificaciones de Mis Proyectos.</p>
                </div>
            `;

            await sendEmail(email, subject, html);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Folder Share error:", error);
        return NextResponse.json({ error: 'Failed to share folder' }, { status: 500 });
    }
}
