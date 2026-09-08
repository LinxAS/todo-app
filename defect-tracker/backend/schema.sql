-- Linxas Defect Tracker schema
-- Run as postgres superuser:
--   createdb linxas_defects
--   psql -U postgres -d linxas_defects -f schema.sql
-- Then grant access:
--   CREATE USER defects_user WITH PASSWORD '...';
--   GRANT CONNECT ON DATABASE linxas_defects TO defects_user;
--   GRANT USAGE ON SCHEMA public TO defects_user;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO defects_user;
--   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO defects_user;

CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS defects (
    id                 SERIAL PRIMARY KEY,
    project_id         INTEGER NOT NULL REFERENCES projects(id),
    title              VARCHAR(255) NOT NULL,
    description        TEXT,
    priority           VARCHAR(10)  NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status             VARCHAR(20)  NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'in_progress', 'pending_info',
                                             'ready_to_test', 'resolved', 'closed', 'cancelled')),
    functional_user_id INTEGER NOT NULL,
    technical_user_id  INTEGER,
    deadline           DATE,
    created_by         INTEGER NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS attachments (
    id            SERIAL PRIMARY KEY,
    defect_id     INTEGER NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
    filename      VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type     VARCHAR(100),
    size_bytes    INTEGER,
    uploaded_by   INTEGER NOT NULL,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defects_project        ON defects(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_status         ON defects(status);
CREATE INDEX IF NOT EXISTS idx_defects_priority       ON defects(priority);
CREATE INDEX IF NOT EXISTS idx_defects_functional     ON defects(functional_user_id);
CREATE INDEX IF NOT EXISTS idx_defects_technical      ON defects(technical_user_id);
CREATE INDEX IF NOT EXISTS idx_defects_created_by     ON defects(created_by);
CREATE INDEX IF NOT EXISTS idx_attachments_defect     ON attachments(defect_id);
