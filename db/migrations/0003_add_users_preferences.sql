-- Adds the JSONB `preferences` column on `users`.
--
-- The application already depends on this column:
--   * app/api/auth/me/route.ts          SELECT ... preferences FROM users
--   * app/api/users/preferences/route.ts  SELECT/UPDATE users.preferences
-- It was never created in the database, so /api/auth/me fails on every
-- request with: column "preferences" does not exist (SQLSTATE 42703).
--
-- Safe and non-destructive: ADD COLUMN with a constant default does not
-- rewrite the table on PostgreSQL 11+, and IF NOT EXISTS makes it idempotent.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
