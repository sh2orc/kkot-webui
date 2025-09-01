-- Add OAuth integration fields to users table
-- Migration: 0013_add_oauth_fields

-- Add OAuth related columns
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN oauth_provider TEXT; -- 'google', 'github', etc.
ALTER TABLE users ADD COLUMN oauth_linked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN oauth_profile_picture TEXT;

-- Create index for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider ON users(oauth_provider);
