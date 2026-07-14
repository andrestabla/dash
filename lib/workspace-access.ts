// Workspace-aware access control (Phase 2).
//
// Access rules for a dashboard or folder:
//   - admin                -> everything (system-wide)
//   - owner                -> their own rows
//   - collaborator         -> rows shared via dashboard_user_permissions
//                             or folder_collaborators
//   - gestor of workspace  -> every dashboard and folder in that workspace
//
// The gestor rule is the only thing Phase 2 adds. It needs no extra query
// parameter: it reuses the bind param that already holds the user id.

import type { PoolClient } from 'pg';

export interface AccessSession {
    id: string;
    role?: string;
}

/**
 * SQL fragment that is true when the current user is an active gestor of
 * the workspace owning the row.
 *
 * @param tableAlias alias of the dashboards/folders table in the query
 *                   (must expose a `workspace_id` column)
 * @param userParam  positional bind marker holding the user id, e.g. "$2"
 */
export function gestorClause(tableAlias: string, userParam: string): string {
    return `EXISTS (SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ${tableAlias}.workspace_id
          AND wm.user_id = ${userParam}
          AND wm.role = 'gestor'
          AND wm.status = 'active')`;
}

/** Workspace ids where the user is an active gestor. */
export async function gestorWorkspaceIds(client: PoolClient, userId: string): Promise<string[]> {
    const res = await client.query(
        `SELECT workspace_id FROM workspace_members
         WHERE user_id = $1 AND role = 'gestor' AND status = 'active'`,
        [userId]
    );
    return res.rows.map((r) => r.workspace_id as string);
}

/** True when the user is an active gestor of the given workspace. */
export async function isGestorOf(client: PoolClient, userId: string, workspaceId: string | null | undefined): Promise<boolean> {
    if (!workspaceId) return false;
    const res = await client.query(
        `SELECT 1 FROM workspace_members
         WHERE user_id = $1 AND workspace_id = $2 AND role = 'gestor' AND status = 'active'`,
        [userId, workspaceId]
    );
    return res.rows.length > 0;
}

/** Active workspace ids the user belongs to (any role). */
export async function memberWorkspaceIds(client: PoolClient, userId: string): Promise<string[]> {
    const res = await client.query(
        `SELECT workspace_id FROM workspace_members
         WHERE user_id = $1 AND status = 'active'`,
        [userId]
    );
    return res.rows.map((r) => r.workspace_id as string);
}

/**
 * True when the user may govern the workspace: a system admin governs every
 * workspace; a gestor governs the ones where their membership role is 'gestor'.
 */
export async function canGovernWorkspace(client: PoolClient, session: AccessSession, workspaceId: string): Promise<boolean> {
    if (session?.role === 'admin') return true;
    return isGestorOf(client, session.id, workspaceId);
}

/**
 * True when the user may read a dashboard: admin, owner, a collaborator
 * (direct or via the parent folder), or a gestor of its workspace.
 */
export async function canAccessDashboard(client: PoolClient, session: AccessSession, dashboardId: string): Promise<boolean> {
    if (session?.role === 'admin') {
        const r = await client.query('SELECT 1 FROM dashboards WHERE id = $1 AND deleted_at IS NULL', [dashboardId]);
        return r.rows.length > 0;
    }
    const r = await client.query(
        `SELECT 1 FROM dashboards d
         WHERE d.id = $1 AND d.deleted_at IS NULL AND (
             d.owner_id = $2
             OR EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2)
             OR EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2)
             OR ${gestorClause('d', '$2')}
         )`,
        [dashboardId, session.id]
    );
    return r.rows.length > 0;
}
