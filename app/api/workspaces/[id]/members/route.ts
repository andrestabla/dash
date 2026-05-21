import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { canGovernWorkspace } from '@/lib/workspace-access';
import { unauthorized, badRequest, forbidden, notFound, serverError } from '@/lib/api-error';

// GET /api/workspaces/[id]/members — members of the workspace (gestor/admin).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession() as any;
    if (!session) return unauthorized();
    const { id: workspaceId } = await params;

    try {
        const client = await pool.connect();
        try {
            if (!(await canGovernWorkspace(client, session, workspaceId))) {
                return forbidden('No gobiernas este workspace');
            }
            const res = await client.query(
                `SELECT wm.id, wm.role, wm.status, wm.created_at,
                        u.id AS user_id, u.name, u.email, u.status AS account_status
                 FROM workspace_members wm
                 JOIN users u ON u.id = wm.user_id
                 WHERE wm.workspace_id = $1
                 ORDER BY (wm.status = 'pending') DESC, u.name ASC NULLS LAST, u.email ASC`,
                [workspaceId]
            );
            return NextResponse.json(res.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Members fetch error', error);
        return serverError('No se pudieron cargar los miembros');
    }
}

// POST /api/workspaces/[id]/members — governance actions on members.
// action: accept | invite | create | set_role | remove
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession() as any;
    if (!session) return unauthorized();
    const { id: workspaceId } = await params;

    try {
        const body = await request.json();
        const { action } = body;

        const client = await pool.connect();
        try {
            if (!(await canGovernWorkspace(client, session, workspaceId))) {
                return forbidden('No gobiernas este workspace');
            }

            // Accept a pending member: activate the membership and the account.
            if (action === 'accept') {
                const { memberId } = body;
                if (!memberId) return badRequest('memberId requerido');
                const memberRes = await client.query(
                    'SELECT user_id FROM workspace_members WHERE id = $1 AND workspace_id = $2',
                    [memberId, workspaceId]
                );
                if (memberRes.rows.length === 0) return notFound('Miembro no encontrado');
                const userId = memberRes.rows[0].user_id;
                await client.query(`UPDATE workspace_members SET status = 'active' WHERE id = $1`, [memberId]);
                await client.query(`UPDATE users SET status = 'active' WHERE id = $1 AND status = 'pending'`, [userId]);
                await client.query(
                    `INSERT INTO notifications (user_id, title, message)
                     VALUES ($1, 'Solicitud aprobada', 'Tu acceso al workspace fue aprobado. Ya puedes ingresar.')`,
                    [userId]
                );
                await logAction(workspaceId, 'WORKSPACE_MEMBER_ACCEPTED', `Miembro ${userId} aceptado`, session.id, client);
                return NextResponse.json({ success: true });
            }

            // Reject a pending join request: drop the membership and, if the
            // account is still globally pending with no workspace left, deny it.
            if (action === 'reject') {
                const { memberId } = body;
                if (!memberId) return badRequest('memberId requerido');
                const memberRes = await client.query(
                    'SELECT user_id, status FROM workspace_members WHERE id = $1 AND workspace_id = $2',
                    [memberId, workspaceId]
                );
                if (memberRes.rows.length === 0) return notFound('Solicitud no encontrada');
                const userId = memberRes.rows[0].user_id;
                await client.query('DELETE FROM workspace_members WHERE id = $1', [memberId]);
                const remaining = await client.query(
                    'SELECT 1 FROM workspace_members WHERE user_id = $1 LIMIT 1', [userId]
                );
                if (remaining.rows.length === 0) {
                    await client.query(`UPDATE users SET status = 'denied' WHERE id = $1 AND status = 'pending'`, [userId]);
                }
                await logAction(workspaceId, 'WORKSPACE_MEMBER_REJECTED', `Solicitud de ${userId} rechazada`, session.id, client);
                return NextResponse.json({ success: true });
            }

            // Invite an existing account into the workspace.
            if (action === 'invite') {
                const email = String(body.email || '').trim().toLowerCase();
                const role = body.role === 'gestor' ? 'gestor' : 'member';
                if (!email) return badRequest('Email requerido');
                const userRes = await client.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
                if (userRes.rows.length === 0) {
                    return notFound('No existe una cuenta con ese correo. Usa "Crear usuario".');
                }
                const userId = userRes.rows[0].id;
                const ins = await client.query(
                    `INSERT INTO workspace_members (workspace_id, user_id, role, status, invited_by)
                     VALUES ($1, $2, $4, 'active', $3)
                     ON CONFLICT (workspace_id, user_id) DO NOTHING
                     RETURNING id`,
                    [workspaceId, userId, session.id, role]
                );
                if (ins.rows.length === 0) return badRequest('El usuario ya es miembro de este workspace');
                await client.query(
                    `INSERT INTO notifications (user_id, title, message)
                     VALUES ($1, 'Invitación a workspace', 'Te añadieron a un nuevo workspace.')`,
                    [userId]
                );
                await logAction(workspaceId, 'WORKSPACE_MEMBER_INVITED', `Usuario ${email} invitado`, session.id, client);
                return NextResponse.json({ success: true });
            }

            // Create a brand-new account and add it as an active member.
            if (action === 'create') {
                const email = String(body.email || '').trim().toLowerCase();
                const name = String(body.name || '').trim();
                const password = String(body.password || '');
                const role = body.role === 'gestor' ? 'gestor' : 'member';
                if (!email || !name || !password) return badRequest('Nombre, email y contraseña son obligatorios');
                if (password.length < 6) return badRequest('La contraseña debe tener al menos 6 caracteres');

                const exists = await client.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
                if (exists.rows.length > 0) return badRequest('Ya existe una cuenta con ese correo');

                const hashed = await bcrypt.hash(password, 10);
                try {
                    await client.query('BEGIN');
                    const userRes = await client.query(
                        `INSERT INTO users (email, password, name, status, role, accepted_privacy_policy)
                         VALUES ($1, $2, $3, 'active', 'user', FALSE) RETURNING id`,
                        [email, hashed, name]
                    );
                    const userId = userRes.rows[0].id;
                    await client.query(
                        `INSERT INTO workspace_members (workspace_id, user_id, role, status, invited_by)
                         VALUES ($1, $2, $4, 'active', $3)`,
                        [workspaceId, userId, session.id, role]
                    );
                    await logAction(workspaceId, 'WORKSPACE_MEMBER_CREATED', `Usuario ${email} creado`, session.id, client);
                    await client.query('COMMIT');
                    return NextResponse.json({ success: true }, { status: 201 });
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                }
            }

            // Change a member's role within the workspace.
            if (action === 'set_role') {
                const { memberId, role } = body;
                if (!memberId || (role !== 'gestor' && role !== 'member')) {
                    return badRequest('memberId y role (gestor|member) requeridos');
                }
                const upd = await client.query(
                    `UPDATE workspace_members SET role = $1 WHERE id = $2 AND workspace_id = $3 RETURNING id`,
                    [role, memberId, workspaceId]
                );
                if (upd.rows.length === 0) return notFound('Miembro no encontrado');
                await logAction(workspaceId, 'WORKSPACE_MEMBER_ROLE', `Miembro ${memberId} -> ${role}`, session.id, client);
                return NextResponse.json({ success: true });
            }

            // Remove a member from the workspace.
            if (action === 'remove') {
                const { memberId } = body;
                if (!memberId) return badRequest('memberId requerido');
                const del = await client.query(
                    'DELETE FROM workspace_members WHERE id = $1 AND workspace_id = $2 RETURNING id',
                    [memberId, workspaceId]
                );
                if (del.rows.length === 0) return notFound('Miembro no encontrado');
                await logAction(workspaceId, 'WORKSPACE_MEMBER_REMOVED', `Miembro ${memberId} eliminado`, session.id, client);
                return NextResponse.json({ success: true });
            }

            return badRequest('Acción no válida');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Members action error', error);
        return serverError('No se pudo completar la acción');
    }
}
