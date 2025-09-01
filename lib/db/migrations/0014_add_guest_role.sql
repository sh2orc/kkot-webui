-- Add guest role to existing users table
-- This migration doesn't alter the schema since SQLite text columns accept any value
-- It's here for documentation purposes

-- Note: The guest role is already supported in the schema.ts file
-- text('role', { enum: ['user', 'admin', 'guest'] }).default('user')

-- If you need to update existing users to guest role based on signup settings:
-- UPDATE users SET role = 'guest' WHERE role = 'user' AND created_at > '2024-01-01';
