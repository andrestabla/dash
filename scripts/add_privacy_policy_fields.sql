-- Add privacy policy tracking fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accepted_privacy_policy BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE;

-- Also add a column for "terms and conditions" just in case we need it later
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accepted_terms_conditions BOOLEAN DEFAULT FALSE;

-- Index for analytics/filtering
CREATE INDEX IF NOT EXISTS idx_users_privacy_policy ON users(accepted_privacy_policy);
