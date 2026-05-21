-- Canonical database schema for roadmap-4shine.
-- Generated from the live database by scripts/dump-schema.mjs.
-- This file is the single source of truth for the schema. Do not edit by hand;
-- evolve the schema with a numbered migration in db/migrations/ and regenerate.

-- Sequences
CREATE SEQUENCE IF NOT EXISTS login_attempts_id_seq;

-- Table: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    action character varying(100) NOT NULL,
    table_name character varying(100),
    record_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    details text,
    performed_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- Table: comments
CREATE TABLE IF NOT EXISTS comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL,
    user_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comments_pkey PRIMARY KEY (id)
);

-- Table: dashboard_collaborators
CREATE TABLE IF NOT EXISTS dashboard_collaborators (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dashboard_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'viewer'::text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT dashboard_collaborators_pkey PRIMARY KEY (id),
    CONSTRAINT dashboard_collaborators_dashboard_id_user_id_key UNIQUE (dashboard_id, user_id)
);

-- Table: dashboard_messages
CREATE TABLE IF NOT EXISTS dashboard_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dashboard_id uuid NOT NULL,
    user_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT dashboard_messages_pkey PRIMARY KEY (id)
);

-- Table: dashboard_user_permissions
CREATE TABLE IF NOT EXISTS dashboard_user_permissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dashboard_id uuid NOT NULL,
    user_id uuid NOT NULL,
    granted_by uuid,
    role character varying(50) DEFAULT 'viewer'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT dashboard_user_permissions_pkey PRIMARY KEY (id),
    CONSTRAINT unique_dashboard_user_access UNIQUE (dashboard_id, user_id)
);

-- Table: dashboards
CREATE TABLE IF NOT EXISTS dashboards (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    settings jsonb DEFAULT '{}'::jsonb,
    folder_id uuid,
    is_public boolean DEFAULT false,
    public_token uuid,
    owner_id uuid,
    start_date date,
    end_date date,
    is_demo boolean DEFAULT false,
    deleted_at timestamp with time zone,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT dashboards_pkey PRIMARY KEY (id),
    CONSTRAINT dashboards_public_token_key UNIQUE (public_token)
);

-- Table: folder_collaborators
CREATE TABLE IF NOT EXISTS folder_collaborators (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    folder_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'viewer'::text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT folder_collaborators_pkey PRIMARY KEY (id),
    CONSTRAINT folder_collaborators_folder_id_user_id_key UNIQUE (folder_id, user_id)
);

-- Table: folders
CREATE TABLE IF NOT EXISTS folders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    parent_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    icon character varying(50) DEFAULT '📁'::character varying,
    color character varying(50) DEFAULT '#3b82f6'::character varying,
    owner_id uuid,
    is_public boolean DEFAULT false,
    public_token text,
    deleted_at timestamp with time zone,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT folders_pkey PRIMARY KEY (id),
    CONSTRAINT folders_public_token_key UNIQUE (public_token)
);

-- Table: login_attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id integer NOT NULL DEFAULT nextval('login_attempts_id_seq'::regclass),
    ip_address character varying(45) NOT NULL,
    email character varying(255) NOT NULL,
    attempted_at timestamp with time zone DEFAULT now(),
    success boolean DEFAULT false,
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    link text,
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Table: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);

-- Table: system_settings
CREATE TABLE IF NOT EXISTS system_settings (
    key text NOT NULL,
    value text,
    description text,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);

-- Table: task_assignees
CREATE TABLE IF NOT EXISTS task_assignees (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    task_id uuid,
    CONSTRAINT task_assignees_pkey PRIMARY KEY (id)
);

-- Table: task_comments
CREATE TABLE IF NOT EXISTS task_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_email text NOT NULL,
    user_name text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    task_id uuid,
    CONSTRAINT task_comments_pkey PRIMARY KEY (id)
);

-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
    week text,
    name text,
    status text,
    owner text,
    type text,
    prio text,
    gate text,
    due text,
    description text,
    dashboard_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamp with time zone,
    position integer DEFAULT 0,
    notification_enabled boolean DEFAULT false,
    notification_value integer,
    notification_unit character varying(10),
    notification_sent boolean DEFAULT false,
    CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    name text,
    status character varying(50) DEFAULT 'active'::character varying,
    accepted_privacy_policy boolean DEFAULT false,
    privacy_policy_accepted_at timestamp with time zone,
    accepted_terms_conditions boolean DEFAULT false,
    privacy_policy_viewed_at timestamp with time zone,
    failed_logins integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    avatar_url text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Foreign keys
ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE dashboard_collaborators ADD CONSTRAINT dashboard_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE dashboard_collaborators ADD CONSTRAINT fk_dashboard_collaborators_dashboard_vfinal FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE dashboard_messages ADD CONSTRAINT dashboard_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE dashboard_messages ADD CONSTRAINT fk_dashboard_messages_dashboard_vfinal FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE dashboard_user_permissions ADD CONSTRAINT dashboard_user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE dashboard_user_permissions ADD CONSTRAINT dashboard_user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE dashboard_user_permissions ADD CONSTRAINT fk_dashboard_user_permissions_dashboard_vfinal FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE folder_collaborators ADD CONSTRAINT folder_collaborators_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE;
ALTER TABLE folder_collaborators ADD CONSTRAINT folder_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE folders ADD CONSTRAINT folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE folders ADD CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE task_assignees ADD CONSTRAINT fk_task_assignees_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE task_assignees ADD CONSTRAINT task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE task_comments ADD CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_dashboard_vfinal FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);
CREATE INDEX idx_audit_log_created ON public.audit_log USING btree (created_at DESC);
CREATE INDEX idx_audit_log_table ON public.audit_log USING btree (table_name, record_id);
CREATE INDEX idx_audit_log_user ON public.audit_log USING btree (user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_comments_created ON public.comments USING btree (created_at DESC);
CREATE INDEX idx_comments_task ON public.comments USING btree (task_id);
CREATE INDEX idx_comments_task_created ON public.comments USING btree (task_id, created_at DESC);
CREATE INDEX idx_comments_user ON public.comments USING btree (user_id);
CREATE INDEX idx_dashboard_messages_created_at ON public.dashboard_messages USING btree (created_at);
CREATE INDEX idx_dashboard_messages_dashboard_id ON public.dashboard_messages USING btree (dashboard_id);
CREATE INDEX idx_dashboard_user_perms_dashboard ON public.dashboard_user_permissions USING btree (dashboard_id);
CREATE INDEX idx_dashboard_user_perms_granted_by ON public.dashboard_user_permissions USING btree (granted_by);
CREATE INDEX idx_dashboard_user_perms_role ON public.dashboard_user_permissions USING btree (role);
CREATE INDEX idx_dashboard_user_perms_user ON public.dashboard_user_permissions USING btree (user_id);
CREATE INDEX idx_dashboards_active ON public.dashboards USING btree (owner_id, created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_dashboards_folder_id ON public.dashboards USING btree (folder_id);
CREATE INDEX idx_dashboards_owner_id ON public.dashboards USING btree (owner_id);
CREATE INDEX idx_folders_active ON public.folders USING btree (owner_id, created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_login_attempts_ip_at ON public.login_attempts USING btree (ip_address, attempted_at);
CREATE INDEX idx_login_attempts_ip_email ON public.login_attempts USING btree (ip_address, email, attempted_at);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE (is_read = false);
CREATE INDEX idx_task_assignees_user ON public.task_assignees USING btree (user_id);
CREATE INDEX idx_tasks_active ON public.tasks USING btree (dashboard_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tasks_dashboard_id ON public.tasks USING btree (dashboard_id);
CREATE INDEX idx_tasks_dashboard_id_status ON public.tasks USING btree (dashboard_id, status);
CREATE INDEX idx_tasks_dashboard_position ON public.tasks USING btree (dashboard_id, "position");
CREATE INDEX idx_tasks_notifications ON public.tasks USING btree (notification_enabled, notification_sent) WHERE ((notification_enabled = true) AND (notification_sent = false));
CREATE INDEX idx_tasks_owner ON public.tasks USING btree (owner);
CREATE INDEX idx_tasks_week ON public.tasks USING btree (week);
CREATE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text));
CREATE INDEX idx_users_privacy_policy ON public.users USING btree (accepted_privacy_policy);
CREATE INDEX idx_users_privacy_viewed ON public.users USING btree (privacy_policy_viewed_at);
