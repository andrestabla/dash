CREATE TABLE IF NOT EXISTS dashboard_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id VARCHAR REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboard_messages_dashboard_id ON dashboard_messages(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_messages_created_at ON dashboard_messages(created_at);
