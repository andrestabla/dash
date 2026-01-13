-- Create task_assignees table
-- task_id must vary char to match tasks table
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_task_assignee UNIQUE (task_id, name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Migrate existing owners to the new table
INSERT INTO task_assignees (task_id, name)
SELECT id, owner
FROM tasks
WHERE owner IS NOT NULL AND owner != ''
ON CONFLICT (task_id, name) DO NOTHING;
