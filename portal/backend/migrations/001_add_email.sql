-- Add email field to users
-- Run: psql -U portal_user -d linxas_portal -h localhost -f portal/backend/migrations/001_add_email.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
