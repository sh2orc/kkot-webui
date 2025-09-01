-- ================================================
-- Users and Authentication Related Tables
-- ================================================

-- Users table with all extensions
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- user, admin, guest
  -- Profile information (0012)
  profile_image TEXT,
  department TEXT,
  phone_number TEXT,
  -- Status and security (0009)
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  email_verified INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP, -- (0016)
  -- OAuth integration (0013)
  google_id TEXT,
  oauth_provider TEXT, -- 'google', 'github', etc.
  oauth_linked_at TIMESTAMP,
  oauth_profile_picture TEXT,
  -- Timestamps
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Roles table for flexible role management
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system INTEGER DEFAULT 0, -- system roles cannot be deleted
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- system, rag, api, chat, admin
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- User roles junction table (multiple roles per user)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at TIMESTAMP,
  assigned_by TEXT,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- User groups junction table
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

-- Group resource permissions table
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

-- User activity logs table (0009 + 0015 combined)
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================
-- INDEXES
-- ================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider ON users(oauth_provider);
CREATE INDEX IF NOT EXISTS idx_users_profile_image ON users(profile_image);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- Role and permission indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- Group indexes
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_group_resource_permissions_group_id ON group_resource_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_resource_permissions_resource ON group_resource_permissions(resource_type, resource_id);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- ================================================
-- DEFAULT DATA
-- ================================================

-- Insert default roles
INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at) VALUES
  ('admin', 'Administrator', 'System administrator with all permissions', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('manager', 'Manager', 'User and content management permissions', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user', 'Regular User', 'Basic usage permissions', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('guest', 'Guest', 'Limited read permissions', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default permissions
INSERT OR IGNORE INTO permissions (id, name, description, category, created_at, updated_at) VALUES
  -- System permissions
  ('system.admin', 'System Administration', 'Full system administration permissions', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system.settings', 'Settings Management', 'System settings modification permissions', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- User management permissions
  ('users.create', 'Create User', 'Create new user accounts', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.read', 'View Users', 'View user information', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.update', 'Update User', 'Modify user information', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.delete', 'Delete User', 'Delete user accounts', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.manage_roles', 'Manage Permissions', 'Assign and modify user permissions', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Chat permissions
  ('chat.create', 'Create Chat', 'Create new chat sessions', 'chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('chat.read', 'View Chat', 'View chat history', 'chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('chat.delete', 'Delete Chat', 'Delete chat sessions', 'chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- RAG permissions
  ('rag.create', 'Create RAG', 'Create RAG system configuration', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rag.read', 'View RAG', 'View RAG configuration', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rag.update', 'Update RAG', 'Modify RAG configuration', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rag.delete', 'Delete RAG', 'Delete RAG configuration', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- API permissions
  ('api.create', 'Create API Key', 'Create API access keys', 'api', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('api.manage', 'Manage API', 'Manage API configuration', 'api', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Assign permissions to roles
-- Admin gets all permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT 'admin', id, CURRENT_TIMESTAMP FROM permissions;

-- Manager gets user and content management permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES
  ('manager', 'users.read', CURRENT_TIMESTAMP),
  ('manager', 'users.update', CURRENT_TIMESTAMP),
  ('manager', 'chat.read', CURRENT_TIMESTAMP),
  ('manager', 'rag.read', CURRENT_TIMESTAMP),
  ('manager', 'rag.update', CURRENT_TIMESTAMP);

-- User gets basic permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES
  ('user', 'chat.create', CURRENT_TIMESTAMP),
  ('user', 'chat.read', CURRENT_TIMESTAMP),
  ('user', 'chat.delete', CURRENT_TIMESTAMP);

-- Guest gets minimal permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES
  ('guest', 'chat.read', CURRENT_TIMESTAMP);

-- Insert default groups
INSERT OR IGNORE INTO groups (id, name, description, is_system) VALUES
  ('admin', 'Administrator', 'System administrator group with all permissions', 1),
  ('default', 'Default User', 'Default group for regular users', 1);
