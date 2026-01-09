-- Add privacy_policy_viewed_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_viewed_at TIMESTAMP WITH TIME ZONE;

-- Add index for potential reporting performance
CREATE INDEX IF NOT EXISTS idx_users_privacy_viewed ON users(privacy_policy_viewed_at);
