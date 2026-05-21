-- Migrate the legacy dashboard_collaborators table into dashboard_user_permissions
-- and drop it. dashboard_collaborators held access grants that no code reads
-- anymore (the app uses dashboard_user_permissions). Copying the rows over makes
-- those grants effective again; pre-existing grants are kept via ON CONFLICT.

INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role)
SELECT dashboard_id, user_id, role
FROM dashboard_collaborators
ON CONFLICT (dashboard_id, user_id) DO NOTHING;

DROP TABLE dashboard_collaborators;
