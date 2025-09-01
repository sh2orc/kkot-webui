-- Add last login tracking to users table
-- Migration: 0016_add_last_login_at

-- Add last_login_at column
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;

-- Create index for faster login tracking queries
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
