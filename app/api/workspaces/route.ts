import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { unauthorized, badRequest, forbidden, serverError } from '@/lib/api-error';

// GET /api/workspaces — workspaces the caller can see.
// Admins see every workspace; everyone else sees the ones they belong to.
export async function GET() {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const client = await pool.connect();
        try {
            const rows = session.role === 'admin'
                ? (await client.query(
                    `SELECT w.*, 'gestor'::text AS my_role,
                            (SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id) AS member_count
                     FROM workspaces w
                     WHERE w.deleted_at IS NULL
                     ORDER BY w.name ASC`
                )).rows
                : (await client.query(
                    `SELECT w.*, m.role AS my_role,
                            (SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id) AS member_count
                     FROM workspaces w
                     JOIN workspace_members m ON m.workspace_id = w.id
                     WHERE w.deleted_at IS NULL AND m.user_id = $1 AND m.status = 'active'
                     ORDER BY w.name ASC`,
                    [session.id]
                )).rows;
            return NextResponse.json(rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Workspaces fetch error', error);
        return serverError('No se pudieron cargar los workspaces');
    }
}

// POST /api/workspaces — admin creates a new workspace.
export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();
    if (session.role !== 'admin') return forbidden('Solo un administrador puede crear workspaces');

    try {
        const { name, description } = await request.json();
        if (!name || !String(name).trim()) return badRequest('El nombre es obligatorio');

        const client = await pool.connect();
        try {
            const res = await client.query(
                'INSERT INTO workspaces (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
                [String(name).trim(), description ? String(description).trim() : null, session.id]
            );
            await logAction(res.rows[0].id, 'WORKSPACE_CREATED', `Workspace "${name}" creado`, session.id, client);
            return NextResponse.json(res.rows[0], { status: 201 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Workspace create error', error);
        return serverError('No se pudo crear el workspace');
    }
}
