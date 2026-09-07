-- TODO App schema (todoapp database)
-- Users are stored in the linxas_portal database; owner_id / shared_with_user_id
-- are plain integers (no FK constraint across databases — enforced at app level).
-- Run this once:  psql -U todoapp_user -d todoapp -f schema.sql

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(10) NOT NULL DEFAULT 'personal' CHECK (category IN ('work', 'personal')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Sharing: a task can be shared with other registered users
CREATE TABLE IF NOT EXISTS task_shares (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER NOT NULL,
    can_edit BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, shared_with_user_id)
);

-- Priority is sorted High -> Medium -> Low, then by deadline ascending (nulls last)
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_sort ON tasks(
    (CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END),
    deadline
);
CREATE INDEX IF NOT EXISTS idx_task_shares_user ON task_shares(shared_with_user_id);
