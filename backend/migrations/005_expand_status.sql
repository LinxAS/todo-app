-- Migration 005: Expand task status from 2 values to 7
-- Run as postgres superuser:
--   psql -d todoapp -f backend/migrations/005_expand_status.sql

ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;

-- Migrate existing data before adding the new constraint
UPDATE tasks SET status = 'new'       WHERE status = 'pending';
-- 'completed' stays as 'completed'

ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (
    status IN ('new', 'in_progress', 'pending_info', 'ready_to_test', 'closed', 'cancelled', 'completed')
);
