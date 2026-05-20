-- Drop legacy duplicate tables that were superseded by other tables the
-- application actually uses. Both were confirmed EMPTY (0 rows) and have NO
-- references anywhere in app/ or lib/ at the time this migration was written.
--
--   audit_log  -> superseded by audit_logs    (the app logs via audit_logs)
--   comments   -> superseded by task_comments (the /api/comments route uses task_comments)
--
-- NOTE: a third legacy table, dashboard_collaborators, is also unused by code
-- but still holds 17 rows. It is intentionally NOT dropped here — see db/README.md.

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS comments;
