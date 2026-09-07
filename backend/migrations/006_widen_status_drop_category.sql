-- Migration 006: Widen status column; category column kept with default 'work'
-- Run as postgres superuser:
--   psql -d todoapp -f backend/migrations/006_widen_status_drop_category.sql

-- status values like 'in_progress' (11), 'pending_info' (12), 'ready_to_test' (13)
-- exceed the old VARCHAR(10) limit.
ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(20);
