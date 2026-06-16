-- 0005_canvas_images.sql
--
-- Canvas comment images used to live as base64 data URLs inside
-- `dashboards.settings -> canvas -> nodes -> commentImages`. A dashboard
-- with a handful of pasted screenshots quickly blew past Vercel's 4.5 MB
-- request-body limit, which blocked *all* further edits to the canvas —
-- not just adding more images. Move them into a dedicated table so the
-- canvas document only ever stores compact references.

CREATE TABLE IF NOT EXISTS canvas_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id uuid NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    data bytea NOT NULL,
    mime text NOT NULL,
    bytes integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_canvas_images_dashboard
    ON canvas_images(dashboard_id);
