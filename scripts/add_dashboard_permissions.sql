-- =====================================================
-- DASHBOARD PERMISSIONS MIGRATION
-- =====================================================
-- Adds granular dashboard-level permissions system
-- =====================================================

-- 1. Create dashboard_user_permissions table
CREATE TABLE IF NOT EXISTS dashboard_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dashboard_id, user_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_dashboard 
ON dashboard_user_permissions(dashboard_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_user 
ON dashboard_user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_granted_by 
ON dashboard_user_permissions(granted_by);

CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_role 
ON dashboard_user_permissions(role);

-- 3. Migrate existing dashboard_collaborators to new table
INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role, created_at)
SELECT dashboard_id, user_id, role, created_at
FROM dashboard_collaborators
ON CONFLICT (dashboard_id, user_id) DO NOTHING;

-- 4. Verification queries
SELECT 
    'dashboard_user_permissions' as table_name,
    COUNT(*) as record_count
FROM dashboard_user_permissions;

-- Show sample permissions
SELECT 
    dup.id,
    d.name as dashboard_name,
    u.email as user_email,
    dup.role,
    dup.created_at
FROM dashboard_user_permissions dup
JOIN dashboards d ON dup.dashboard_id = d.id
JOIN users u ON dup.user_id = u.id
ORDER BY dup.created_at DESC
LIMIT 10;

-- Note: dashboard_collaborators table is kept for backward compatibility
-- but new permissions should use dashboard_user_permissions
