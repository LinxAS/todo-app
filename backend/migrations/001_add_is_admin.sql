-- Run once on the server:
--   psql -U todoapp_user -d todoapp -h localhost -f backend/migrations/001_add_is_admin.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
