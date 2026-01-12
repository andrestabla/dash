-- Bridge Migration: Legacy to Modern (V3 - Non-strict)
-- Removes strict FK constraints to bypass UUID/VARCHAR type mismatches

-- 1. Evolve 'folders' table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE folders ADD COLUMN IF NOT EXISTS color VARCHAR(20);
ALTER TABLE folders ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255); -- VARCHAR to match users.id
ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS public_token UUID;

-- 2. Create 'dashboards' table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    folder_id VARCHAR(255), 
    owner_id VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_public BOOLEAN DEFAULT FALSE,
    public_token UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Data migration
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
        IF NOT EXISTS (SELECT 1 FROM dashboards LIMIT 1) THEN
            INSERT INTO dashboards (name, description, created_at)
            SELECT title, description, created_at FROM projects; 
        END IF;
    END IF;
END $$;

-- 4. Create dashboard_user_permissions (NO strict FKs due to type mismatch)
CREATE TABLE IF NOT EXISTS dashboard_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    granted_by VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dashboard_id, user_id)
);

-- 5. Create core tables if missing
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL,
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

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
