-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR DASH APPLICATION
-- =====================================================
-- This script creates all necessary tables with proper
-- columns, constraints, and indexes for the application
-- =====================================================

-- 1. USERS TABLE
-- Stores user accounts with authentication and roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. FOLDERS TABLE
-- Hierarchical folder structure with icons, colors, and public sharing
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    icon VARCHAR(50),
    color VARCHAR(20),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    public_token UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_public_token ON folders(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_is_public ON folders(is_public) WHERE is_public = TRUE;

-- 3. DASHBOARDS TABLE
-- Project boards/dashboards with settings and public sharing
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    is_public BOOLEAN DEFAULT FALSE,
    public_token UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboards_folder ON dashboards(folder_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON dashboards(owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_public_token ON dashboards(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboards_is_public ON dashboards(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_dashboards_created ON dashboards(created_at DESC);

-- 4. TASKS TABLE
-- Individual tasks/cards within dashboards
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(100),
    week VARCHAR(50),
    owner VARCHAR(255),
    type VARCHAR(100),
    prio VARCHAR(20),
    gate VARCHAR(50),
    due DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_dashboard ON tasks(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

-- 5. COMMENTS TABLE
-- Comments on tasks
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- 6. FOLDER_COLLABORATORS TABLE
-- Shared access to folders
CREATE TABLE IF NOT EXISTS folder_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(folder_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_folder_collab_folder ON folder_collaborators(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_collab_user ON folder_collaborators(user_id);

-- 7. DASHBOARD_COLLABORATORS TABLE
-- Shared access to dashboards
CREATE TABLE IF NOT EXISTS dashboard_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dashboard_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_collab_dashboard ON dashboard_collaborators(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_collab_user ON dashboard_collaborators(user_id);

-- 8. NOTIFICATIONS TABLE
-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 9. SYSTEM_SETTINGS TABLE
-- Application-wide settings
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ORGANIZATION_SETTINGS TABLE (if multi-tenant)
-- Organization-specific branding and configuration
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    app_name VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(20),
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_user VARCHAR(255),
    smtp_pass VARCHAR(255),
    smtp_from VARCHAR(255),
    r2_account_id VARCHAR(255),
    r2_access_key_id VARCHAR(255),
    r2_secret_access_key VARCHAR(255),
    r2_bucket_name VARCHAR(255),
    r2_public_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default system settings
INSERT INTO system_settings (key, value, description)
VALUES 
    ('app_name', 'Roadmap 4Shine', 'Application Name'),
    ('logo_url', 'https://www.algoritmot.com/wp-content/uploads/2022/08/Recurso-8-1536x245.png', 'App Logo URL'),
    ('smtp_host', '', 'Email Server Host'),
    ('smtp_port', '587', 'Email Server Port'),
    ('smtp_user', '', 'Email Username'),
    ('smtp_pass', '', 'Email Password'),
    ('smtp_from', 'no-reply@roadmap.com', 'Default Sender Email')
ON CONFLICT (key) DO NOTHING;

-- Insert default admin user
-- Password: admin123
-- Hash: $2b$10$PzsiA/14UnT3yxavgKfIwOZm/pc4UJcaKRPLxjNBJk6cKlRBoy/AO
INSERT INTO users (email, password, name, role) 
VALUES (
    'proyectos@algoritmot.com', 
    '$2b$10$PzsiA/14UnT3yxavgKfIwOZm/pc4UJcaKRPLxjNBJk6cKlRBoy/AO',
    'Admin',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count records in each table
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'folders', COUNT(*) FROM folders
UNION ALL
SELECT 'dashboards', COUNT(*) FROM dashboards
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'folder_collaborators', COUNT(*) FROM folder_collaborators
UNION ALL
SELECT 'dashboard_collaborators', COUNT(*) FROM dashboard_collaborators
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'system_settings', COUNT(*) FROM system_settings;
