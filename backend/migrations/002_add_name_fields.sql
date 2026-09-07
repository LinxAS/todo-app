-- Run once on the server:
--   psql -U todoapp_user -d todoapp -h localhost -f backend/migrations/002_add_name_fields.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
