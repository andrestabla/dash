-- Phase 1 of the workspace governance model.
--
-- Introduces a workspace tier between the system and folders/dashboards:
--   Sistema -> Workspaces -> Carpetas (hasta 5 niveles) -> Proyectos (dashboards)
--
-- Membership is many-to-many. A member's role *within* a workspace is
-- 'gestor' (workspace-level governance) or 'member'. The system-level
-- role ('admin' / 'user') on the users table is unchanged: an admin
-- governs every workspace.
--
-- This migration only adds structure and adopts existing data into a
-- default workspace. No application behaviour changes until Phase 2.

-- 1. Workspace tables -------------------------------------------------------

CREATE TABLE IF NOT EXISTS workspaces (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL DEFAULT 'member',
    status character varying(20) NOT NULL DEFAULT 'active',
    invited_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
    CONSTRAINT workspace_members_workspace_user_key UNIQUE (workspace_id, user_id),
    CONSTRAINT workspace_members_role_check CHECK (role IN ('gestor', 'member')),
    CONSTRAINT workspace_members_status_check CHECK (status IN ('active', 'pending'))
);

-- 2. Default workspace ------------------------------------------------------
-- A fixed id so the application and later migrations can reference it.

INSERT INTO workspaces (id, name, description)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Workspace principal',
    'Workspace por defecto creado al introducir la gobernanza por workspaces. Adopta todos los datos previos.'
)
ON CONFLICT (id) DO NOTHING;

-- Every existing user becomes an active member of the default workspace.
-- System admins are seeded as 'gestor' so the workspace has governance.
INSERT INTO workspace_members (workspace_id, user_id, role, status)
SELECT '11111111-1111-1111-1111-111111111111',
       u.id,
       CASE WHEN u.role = 'admin' THEN 'gestor' ELSE 'member' END,
       'active'
FROM users u
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 3. Attach folders and dashboards to a workspace --------------------------
-- NOT NULL with a DEFAULT of the main workspace: existing rows are adopted
-- automatically and pre-Phase-2 code keeps working until it sets the column
-- explicitly.

ALTER TABLE folders
    ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL
    DEFAULT '11111111-1111-1111-1111-111111111111';

ALTER TABLE dashboards
    ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL
    DEFAULT '11111111-1111-1111-1111-111111111111';

-- 4. Foreign keys -----------------------------------------------------------

ALTER TABLE workspaces
    ADD CONSTRAINT workspaces_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workspace_members
    ADD CONSTRAINT workspace_members_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE folders
    ADD CONSTRAINT folders_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

ALTER TABLE dashboards
    ADD CONSTRAINT dashboards_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- 5. Indexes ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_folders_workspace ON folders (workspace_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_workspace ON dashboards (workspace_id);
