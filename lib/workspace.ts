// Workspace governance model (Phase 1 — data model).
//
// Hierarchy:  Sistema -> Workspaces -> Carpetas (hasta 5 niveles) -> Proyectos
//
// Membership is many-to-many: a user can belong to several workspaces.
// The role a user holds *within* a workspace ('gestor' | 'member') is
// separate from the system role on the users table ('admin' | 'user').
// An admin governs every workspace; a gestor governs the workspaces where
// their membership role is 'gestor'.

/** Default workspace that adopts every record created before workspaces existed. */
export const DEFAULT_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

/** Maximum folder nesting depth inside a workspace. */
export const MAX_FOLDER_DEPTH = 5;

/** Role a user holds within a single workspace. */
export type WorkspaceRole = 'gestor' | 'member';

/** Membership lifecycle. 'pending' until a gestor or admin accepts the user. */
export type WorkspaceMemberStatus = 'active' | 'pending';

export interface Workspace {
    id: string;
    name: string;
    description: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    status: WorkspaceMemberStatus;
    invited_by: string | null;
    created_at: string;
}
