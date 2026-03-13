-- Migration to add notification fields to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_value INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_unit VARCHAR(10);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Index for the cron job to efficiently find tasks that need notifications
CREATE INDEX IF NOT EXISTS idx_tasks_notifications ON tasks(notification_enabled, notification_sent) WHERE notification_enabled = TRUE AND notification_sent = FALSE;
