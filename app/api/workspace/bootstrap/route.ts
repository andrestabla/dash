import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-error';
import { gestorClause } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

// One-stop bootstrap call for the workspace page. The page used to fire five
// independent requests in parallel (dashboards, folders, users list, workspaces,
// auth/me). Under Vercel cold starts those round trips multiply — every one
// risks its own multi-second cold start. This collapses all of them into a
// single function invocation that fans out via the pool.
//
// `settings - 'canvas'` strips the heavy canvas JSON blob from each dashboard
// row so the listing payload stays small even when one of the user's boards
// holds many megabytes of nodes.
export async function GET() {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    const userId = session.id;
    const isAdmin = session.role === 'admin';

    try {
        const dashboardsSql = isAdmin
            ? `SELECT id, name, description, settings - 'canvas' AS settings, folder_id,
                       start_date, end_date, is_demo, owner_id, workspace_id, created_at
                 FROM dashboards
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC`
            : `SELECT d.id, d.name, d.description, d.settings - 'canvas' AS settings, d.folder_id,
                       d.start_date, d.end_date, d.is_demo, d.owner_id, d.workspace_id, d.created_at
                 FROM dashboards d
                WHERE d.deleted_at IS NULL AND (
                       d.owner_id = $1
                   OR EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $1)
                   OR d.folder_id IN (SELECT folder_id FROM folder_collaborators WHERE user_id = $1)
                   OR ${gestorClause('d', '$1')}
                )
                ORDER BY d.created_at DESC`;

        const foldersSql = isAdmin
            ? `SELECT * FROM folders ORDER BY name ASC`
            : `SELECT f.* FROM folders f
                WHERE f.owner_id = $1
                   OR f.id IN (SELECT folder_id FROM folder_collaborators WHERE user_id = $1)
                   OR ${gestorClause('f', '$1')}
                ORDER BY f.name ASC`;

        const workspacesSql = isAdmin
            ? `SELECT w.*, 'gestor'::text AS my_role,
                       (SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id) AS member_count
                  FROM workspaces w
                 WHERE w.deleted_at IS NULL
                 ORDER BY w.name ASC`
            : `SELECT w.*, m.role AS my_role,
                       (SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id) AS member_count
                  FROM workspaces w
                  JOIN workspace_members m ON m.workspace_id = w.id
                 WHERE w.deleted_at IS NULL AND m.user_id = $1 AND m.status = 'active'
                 ORDER BY w.name ASC`;

        // Use pool.query (not a single client.query) so the queries actually
        // run in parallel — a single pg client serialises queries on the wire.
        const params = isAdmin ? [] : [userId];
        const [dashboardsRes, foldersRes, usersRes, workspacesRes, meRes] = await Promise.all([
            pool.query(dashboardsSql, params),
            pool.query(foldersSql, params),
            pool.query(`SELECT id, email, name FROM users WHERE status = 'active' ORDER BY name ASC`),
            pool.query(workspacesSql, isAdmin ? [] : [userId]),
            pool.query(`SELECT id, name, email, role, preferences FROM users WHERE id = $1`, [userId])
        ]);

        return NextResponse.json({
            dashboards: dashboardsRes.rows,
            folders: foldersRes.rows,
            users: usersRes.rows,
            workspaces: workspacesRes.rows,
            user: meRes.rows[0] || null
        }, {
            headers: { 'Cache-Control': 'private, max-age=10' }
        });
    } catch (error) {
        console.error('Workspace bootstrap error', error);
        return serverError('No se pudo cargar el espacio de trabajo');
    }
}
