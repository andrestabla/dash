import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-error';
import { isGestorOf } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// PATCH /api/folders/[id]/analytics-config
// Body: { excludedDashboardIds: string[] }
//
// The folder owns a list of dashboard ids that should be hidden from its
// consolidated analytics view AND from the public share derived from it.
// Only owners / collaborators with edit rights / workspace gestors / admins
// can flip the toggles. The dashboards themselves don't need to live in
// this folder for the persistence to succeed — the analytics view only
// applies the exclusion to dashboards it actually surfaces.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    const { id } = await params;
    if (!UUID_RE.test(id)) return badRequest('Invalid folder id');

    let body: { excludedDashboardIds?: unknown };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const raw = body.excludedDashboardIds;
    if (!Array.isArray(raw)) return badRequest('excludedDashboardIds must be an array');
    const excluded = raw.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v));
    // Deduplicate.
    const unique = Array.from(new Set(excluded));

    const client = await pool.connect();
    try {
        const folderRes = await client.query(
            'SELECT owner_id, workspace_id, is_public FROM folders WHERE id = $1',
            [id]
        );
        if (folderRes.rows.length === 0) return notFound('Folder not found');
        const folder = folderRes.rows[0];

        const isAdmin = session.role === 'admin';
        const isOwner = folder.owner_id === session.id;
        let isCollaborator = false;
        if (!isAdmin && !isOwner) {
            const coll = await client.query(
                "SELECT 1 FROM folder_collaborators WHERE folder_id = $1 AND user_id = $2 AND role IN ('editor','admin','owner')",
                [id, session.id]
            );
            isCollaborator = coll.rows.length > 0;
        }
        const isGestor = !isAdmin && !isOwner && !isCollaborator
            ? await isGestorOf(client, session.id, folder.workspace_id)
            : false;

        if (!isAdmin && !isOwner && !isCollaborator && !isGestor) return forbidden();

        await client.query(
            `UPDATE folders SET analytics_excluded_dashboard_ids = $1::uuid[], updated_at = NOW() WHERE id = $2`,
            [unique, id]
        );

        // Keep board publication in sync with the public share: while the folder
        // is public, every included board in its subtree stays public (and
        // reachable from the public analytics), while excluded boards are
        // revoked so they can't be opened through a stale token.
        if (folder.is_public) {
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
                    AND deleted_at IS NULL
                    AND id <> ALL($2::uuid[])`,
                [id, unique]
            );
            await client.query(
                `WITH RECURSIVE folder_tree AS (
                     SELECT id FROM folders WHERE id = $1
                     UNION ALL
                     SELECT f.id FROM folders f
                     INNER JOIN folder_tree ft ON f.parent_id = ft.id
                 )
                 UPDATE dashboards
                    SET is_public = FALSE
                  WHERE folder_id IN (SELECT id FROM folder_tree)
                    AND id = ANY($2::uuid[])`,
                [id, unique]
            );
        }

        return NextResponse.json({ excludedDashboardIds: unique });
    } catch (error) {
        console.error('Folder analytics config error:', error);
        return serverError('Failed to update analytics config');
    } finally {
        client.release();
    }
}
