import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, badRequest, forbidden, notFound, serverError } from '@/lib/api-error';
import { DEFAULT_WORKSPACE_ID, MAX_FOLDER_DEPTH } from '@/lib/workspace';
import { gestorClause, isGestorOf } from '@/lib/workspace-access';

// Depth of a folder counting itself and all ancestors (a root folder is 1).
async function folderDepth(client: PoolClient, folderId: string): Promise<number> {
    const r = await client.query(
        `WITH RECURSIVE chain AS (
            SELECT id, parent_id, 1 AS depth FROM folders WHERE id = $1
            UNION ALL
            SELECT f.id, f.parent_id, c.depth + 1 FROM folders f JOIN chain c ON f.id = c.parent_id
         )
         SELECT COALESCE(MAX(depth), 0) AS d FROM chain`,
        [folderId]
    );
    return Number(r.rows[0]?.d || 0);
}

// Height of the subtree rooted at a folder (the folder itself is 1).
async function subtreeHeight(client: PoolClient, folderId: string): Promise<number> {
    const r = await client.query(
        `WITH RECURSIVE sub AS (
            SELECT id, 1 AS lvl FROM folders WHERE id = $1
            UNION ALL
            SELECT f.id, s.lvl + 1 FROM folders f JOIN sub s ON f.parent_id = s.id
         )
         SELECT COALESCE(MAX(lvl), 1) AS h FROM sub`,
        [folderId]
    );
    return Number(r.rows[0]?.h || 1);
}

// Ids of every folder in the subtree rooted at a folder (includes itself).
async function subtreeFolderIds(client: PoolClient, folderId: string): Promise<string[]> {
    const r = await client.query(
        `WITH RECURSIVE sub AS (
            SELECT id FROM folders WHERE id = $1
            UNION ALL
            SELECT f.id FROM folders f JOIN sub s ON f.parent_id = s.id
         )
         SELECT id FROM sub`,
        [folderId]
    );
    return r.rows.map((x) => x.id as string);
}

// True when the user owns, collaborates on, governs (gestor) or admins a folder.
async function canAccessFolder(client: PoolClient, session: any, folderId: string): Promise<boolean> {
    if (session.role === 'admin') return true;
    const r = await client.query(
        `SELECT 1 FROM folders f WHERE f.id = $1 AND (
            f.owner_id = $2
            OR EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = f.id AND fc.user_id = $2)
            OR ${gestorClause('f', '$2')}
         )`,
        [folderId, session.id]
    );
    return r.rows.length > 0;
}

export async function GET() {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const client = await pool.connect();
        try {

            let query;
            let params: any[] = [];


            if (session.role === 'admin') {
                query = 'SELECT * FROM folders ORDER BY name ASC';
            } else {
                query = `
                    SELECT f.* FROM folders f
                    WHERE f.owner_id = $1
                    OR f.id IN (SELECT folder_id FROM folder_collaborators WHERE user_id = $1)
                    OR ${gestorClause('f', '$1')}
                    ORDER BY f.name ASC
                `;
                params = [session.id];
            }

            const res = await client.query(query, params);
            return NextResponse.json(res.rows);
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Folder Fetch error:", error);
        return serverError('Failed to fetch folders');
    }
}


export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { name, parent_id, icon, color } = body;

        if (!name) return badRequest('Name is required');

        const client = await pool.connect();
        try {
            // A child folder inherits its parent's workspace and must respect
            // the depth limit; a root folder lands in the default workspace.
            let workspaceId: string = DEFAULT_WORKSPACE_ID;
            if (parent_id) {
                const parent = await client.query('SELECT workspace_id FROM folders WHERE id = $1', [parent_id]);
                if (parent.rows.length === 0) return badRequest('Carpeta padre no encontrada');
                if (!(await canAccessFolder(client, session, parent_id))) return forbidden();
                const parentDepth = await folderDepth(client, parent_id);
                if (parentDepth >= MAX_FOLDER_DEPTH) {
                    return badRequest(`Máximo ${MAX_FOLDER_DEPTH} niveles de carpetas`);
                }
                workspaceId = parent.rows[0].workspace_id;
            }

            const res = await client.query(
                'INSERT INTO folders (name, parent_id, icon, color, owner_id, workspace_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [name, parent_id || null, icon || '📁', color || '#3b82f6', session.id, workspaceId]
            );

            return NextResponse.json(res.rows[0]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Folder Create error:", error);
        return serverError('Failed to create folder');
    }
}

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { id, name, parent_id, icon, color, workspace_id } = body;

        if (!id || !name) return badRequest('ID and Name are required');

        // Prevent circular reference
        if (id === parent_id) return badRequest('Cannot move folder inside itself');

        const client = await pool.connect();
        try {

            // Check permission: admin, owner, or workspace gestor.
            const check = await client.query('SELECT owner_id, workspace_id FROM folders WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                return notFound('Folder not found');
            }
            const folder = check.rows[0];

            if (session.role !== 'admin' && folder.owner_id !== session.id) {
                if (!(await isGestorOf(client, session.id, folder.workspace_id))) {
                    return forbidden();
                }
            }

            let nextParentId: string | null = parent_id || null;
            let workspaceId: string = folder.workspace_id;

            if (workspace_id && workspace_id !== folder.workspace_id) {
                // Explicit move to another workspace: validate the workspace and
                // the caller's membership, then detach from the parent (which
                // lives in the old workspace).
                const wsExists = await client.query(
                    'SELECT 1 FROM workspaces WHERE id = $1 AND deleted_at IS NULL', [workspace_id]
                );
                if (wsExists.rows.length === 0) return badRequest('El workspace destino no existe');
                if (session.role !== 'admin') {
                    const mem = await client.query(
                        `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'`,
                        [workspace_id, session.id]
                    );
                    if (mem.rows.length === 0) return forbidden('No perteneces al workspace destino');
                }
                nextParentId = null;
                workspaceId = workspace_id;
            } else if (nextParentId) {
                // The new parent must not sit inside the folder's own subtree.
                const subtree = await subtreeFolderIds(client, id);
                if (subtree.includes(nextParentId)) {
                    return badRequest('No puedes mover una carpeta dentro de sí misma');
                }
                const parent = await client.query('SELECT workspace_id FROM folders WHERE id = $1', [nextParentId]);
                if (parent.rows.length === 0) return badRequest('Carpeta padre no encontrada');
                if (!(await canAccessFolder(client, session, nextParentId))) return forbidden();
                // parent depth + height of the moved subtree must stay <= MAX.
                const parentDepth = await folderDepth(client, nextParentId);
                const movedHeight = await subtreeHeight(client, id);
                if (parentDepth + movedHeight > MAX_FOLDER_DEPTH) {
                    return badRequest(`Máximo ${MAX_FOLDER_DEPTH} niveles de carpetas`);
                }
                workspaceId = parent.rows[0].workspace_id;
            }

            try {
                await client.query('BEGIN');
                const res = await client.query(
                    'UPDATE folders SET name = $1, parent_id = $2, icon = $3, color = $4, workspace_id = $5 WHERE id = $6 RETURNING *',
                    [name, nextParentId, icon || '📁', color || '#3b82f6', workspaceId, id]
                );

                // When the move changes workspace, the whole subtree (folders
                // and their dashboards) follows.
                if (workspaceId !== folder.workspace_id) {
                    await client.query(
                        `WITH RECURSIVE sub AS (
                            SELECT id FROM folders WHERE id = $1
                            UNION ALL
                            SELECT f.id FROM folders f JOIN sub s ON f.parent_id = s.id
                         )
                         UPDATE folders SET workspace_id = $2 WHERE id IN (SELECT id FROM sub)`,
                        [id, workspaceId]
                    );
                    await client.query(
                        `WITH RECURSIVE sub AS (
                            SELECT id FROM folders WHERE id = $1
                            UNION ALL
                            SELECT f.id FROM folders f JOIN sub s ON f.parent_id = s.id
                         )
                         UPDATE dashboards SET workspace_id = $2 WHERE folder_id IN (SELECT id FROM sub)`,
                        [id, workspaceId]
                    );
                }
                await client.query('COMMIT');
                return NextResponse.json(res.rows[0]);
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            }
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Folder Update error:", error);
        return serverError('Failed to update folder');
    }
}

export async function DELETE(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return badRequest('ID is required');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check permission: admin, owner, or workspace gestor.
            const check = await client.query('SELECT owner_id, workspace_id FROM folders WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return notFound('Folder not found');
            }

            if (session.role !== 'admin' && check.rows[0].owner_id !== session.id) {
                if (!(await isGestorOf(client, session.id, check.rows[0].workspace_id))) {
                    await client.query('ROLLBACK');
                    return forbidden();
                }
            }

            // 1. Move subfolders to root
            await client.query('UPDATE folders SET parent_id = NULL WHERE parent_id = $1', [id]);

            // 2. Move dashboards to root
            await client.query('UPDATE dashboards SET folder_id = NULL WHERE folder_id = $1', [id]);

            // 3. Delete the folder
            await client.query('DELETE FROM folders WHERE id = $1', [id]);

            await client.query('COMMIT');
            return NextResponse.json({ success: true });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Folder Delete error:", error);
        return serverError('Failed to delete folder');
    }
}
