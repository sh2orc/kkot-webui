-- Add profile image field to users table
-- Migration: 0012_add_profile_image

-- Add profile_image column to users table
ALTER TABLE users ADD COLUMN profile_image TEXT;

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_users_profile_image ON users(profile_image);
