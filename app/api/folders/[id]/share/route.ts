import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { unauthorized, badRequest, notFound, forbidden, serverError } from '@/lib/api-error';
import { isGestorOf } from '@/lib/workspace-access';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    const { id } = await params;

    try {
        const body = await request.json();
        const { action, email, role, notify } = body;

        const client = await pool.connect();

        let folder: any;
        let targetUser: any;
        let dashboardCount = 0;
        try {

            // Handle toggle_public action for public link sharing
            if (action === 'toggle_public') {
                const { isPublic } = body;

                // Verify folder exists and user has permission
                const folderRes = await client.query(
                    `SELECT name, owner_id, workspace_id,
                            COALESCE(analytics_excluded_dashboard_ids, '{}'::uuid[]) AS excluded
                       FROM folders WHERE id = $1`,
                    [id]
                );
                if (folderRes.rows.length === 0) {
                    return notFound('Folder not found');
                }

                const toggleFolder = folderRes.rows[0];
                if (session.role !== 'admin' && toggleFolder.owner_id !== session.id) {
                    if (!(await isGestorOf(client, session.id, toggleFolder.workspace_id))) {
                        return forbidden();
                    }
                }

                const excluded = Array.isArray(toggleFolder.excluded) ? toggleFolder.excluded : [];
                let token = null;

                if (isPublic) {
                    // Generate token if not exists
                    const res = await client.query('SELECT public_token FROM folders WHERE id = $1', [id]);
                    token = res.rows[0]?.public_token;

                    if (!token) {
                        token = crypto.randomUUID();
                        await client.query('UPDATE folders SET is_public = TRUE, public_token = $1 WHERE id = $2', [token, id]);
                    } else {
                        await client.query('UPDATE folders SET is_public = TRUE WHERE id = $1', [id]);
                    }

                    // Publish every dashboard in the folder subtree so the boards
                    // linked from the public analytics are actually reachable.
                    // Dashboards the owner excluded from the consolidated analytics
                    // stay private (they aren't shown in the public view either).
                    await client.query(
                        `WITH RECURSIVE folder_tree AS (
                             SELECT id FROM folders WHERE id = $1
                             UNION ALL
                             SELECT f.id FROM folders f
                             INNER JOIN folder_tree ft ON f.parent_id = ft.id
                         )
                         UPDATE dashboards
                            SET is_public = TRUE,
                                public_token = COALESCE(public_token, gen_random_uuid())
                          WHERE folder_id IN (SELECT id FROM folder_tree)
                            AND id <> ALL($2::uuid[])`,
                        [id, excluded]
                    );
                } else {
                    await client.query('UPDATE folders SET is_public = FALSE WHERE id = $1', [id]);

                    // Turning off the folder's public link also revokes the boards
                    // that were exposed through it, so nothing stays reachable by a
                    // stale token once the consolidated share is disabled.
                    await client.query(
                        `WITH RECURSIVE folder_tree AS (
                             SELECT id FROM folders WHERE id = $1
                             UNION ALL
                             SELECT f.id FROM folders f
                             INNER JOIN folder_tree ft ON f.parent_id = ft.id
                         )
                         UPDATE dashboards
                            SET is_public = FALSE
                          WHERE folder_id IN (SELECT id FROM folder_tree)`,
                        [id]
                    );
                }

                return NextResponse.json({ success: true, isPublic, token });
            }

            // Handle user collaboration sharing with dashboard selection
            if (!email) return badRequest('Email is required');

            const { dashboardIds } = body; // Array of dashboard IDs to grant access to

            // 1. Check if folder exists and user has permission (Owner or Admin)
            const folderRes = await client.query('SELECT name, owner_id, workspace_id FROM folders WHERE id = $1', [id]);
            if (folderRes.rows.length === 0) {
                return notFound('Folder not found');
            }

            folder = folderRes.rows[0];
            if (session.role !== 'admin' && folder.owner_id !== session.id) {
                if (!(await isGestorOf(client, session.id, folder.workspace_id))) {
                    return forbidden();
                }
            }

            // 2. Find target user
            const userRes = await client.query('SELECT id, name FROM users WHERE email = $1', [email]);
            if (userRes.rows.length === 0) {
                return notFound('User not found in system. They must be registered first.');
            }
            targetUser = userRes.rows[0];

            // 3. Add to folder collaborators
            await client.query(
                'INSERT INTO folder_collaborators (folder_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (folder_id, user_id) DO UPDATE SET role = EXCLUDED.role',
                [id, targetUser.id, role || 'viewer']
            );

            // 4. Add dashboard-level permissions for selected dashboards
            if (dashboardIds && Array.isArray(dashboardIds) && dashboardIds.length > 0) {
                for (const dashboardId of dashboardIds) {
                    // Verify dashboard belongs to this folder
                    const dashRes = await client.query(
                        'SELECT id FROM dashboards WHERE id = $1 AND folder_id = $2',
                        [dashboardId, id]
                    );

                    if (dashRes.rows.length > 0) {
                        // Add permission to dashboard_user_permissions table
                        await client.query(
                            `INSERT INTO dashboard_user_permissions (dashboard_id, user_id, granted_by, role)
                             VALUES ($1, $2, $3, $4)
                             ON CONFLICT (dashboard_id, user_id) DO UPDATE SET role = $4, granted_by = $3`,
                            [dashboardId, targetUser.id, session.id, role || 'viewer']
                        );
                        dashboardCount++;
                    }
                }
            }
        } finally {
            client.release();
        }

        // 5. Send Notification if requested
        if (notify) {
            const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`;
            const base = process.env.NEXT_PUBLIC_APP_URL || origin || 'https://misproyectos.com.co';
            const subject = `Invitación a carpeta compartida: ${folder.name}`;
            const link = `${base}/workspace`;

            const dashboardText = dashboardCount > 0
                ? `con acceso a ${dashboardCount} tablero${dashboardCount > 1 ? 's' : ''}`
                : '';

            const html = `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #3b82f6;">📁 Carpeta Compartida</h2>
                    <p>Hola,</p>
                    <p>Has recibido acceso a la carpeta <b>"${folder.name}"</b> en Mis Proyectos ${dashboardText}.</p>
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

        return NextResponse.json({
            success: true,
            dashboardsShared: dashboardCount
        });

    } catch (error) {
        console.error("Folder Share error:", error);
        return serverError('Failed to share folder');
    }
}
