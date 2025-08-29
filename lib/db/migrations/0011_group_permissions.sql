-- Group-based permissions migration
-- Migration: 0011_group_permissions

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Create user_groups junction table
CREATE TABLE IF NOT EXISTS user_groups (
  user_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Create group_resource_permissions table
CREATE TABLE IF NOT EXISTS group_resource_permissions (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('agent', 'model', 'rag_collection', 'vector_store')),
  resource_id TEXT NOT NULL,
  permissions TEXT NOT NULL, -- JSON array: ['read', 'write', 'delete']
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_group_resource_permissions_group_id ON group_resource_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_resource_permissions_resource ON group_resource_permissions(resource_type, resource_id);

-- Insert default groups
INSERT OR IGNORE INTO groups (id, name, description, is_system) VALUES
  ('admin', 'Administrator', 'System administrator group with all permissions', 1),
  ('default', 'Default User', 'Default group for regular users', 1);

-- Migrate existing admin users to admin group
INSERT OR IGNORE INTO user_groups (user_id, group_id)
SELECT id, 'admin' FROM users WHERE role = 'admin';

-- Migrate existing regular users to default group
INSERT OR IGNORE INTO user_groups (user_id, group_id)
SELECT id, 'default' FROM users WHERE role = 'user';
