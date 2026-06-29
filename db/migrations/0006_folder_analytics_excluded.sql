-- 0006_folder_analytics_excluded.sql
--
-- Per-folder list of dashboards excluded from the consolidated analytics
-- view (and from the public share derived from it). Empty array = every
-- dashboard in the folder subtree counts, which is the only sensible default
-- and matches the previous behaviour.

ALTER TABLE folders
    ADD COLUMN IF NOT EXISTS analytics_excluded_dashboard_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
