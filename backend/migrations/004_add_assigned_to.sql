-- Migration 004: Replace task_shares with assigned_to on tasks
-- Run as todoapp_user (or postgres superuser):
--   psql -U todoapp_user -d todoapp -h localhost -f backend/migrations/004_add_assigned_to.sql

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to INTEGER;

DROP TABLE IF EXISTS task_shares;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
