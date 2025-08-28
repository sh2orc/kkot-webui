-- User table extension for advanced permissions and profile
-- Migration: 0009_user_permissions_extension

-- Add new columns to users table
ALTER TABLE users ADD COLUMN profile_image TEXT;
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'; -- active, inactive, suspended
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- system, rag, api, chat, admin
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Create roles table for more flexible role management
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system INTEGER DEFAULT 0, -- system roles cannot be deleted
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Create user_roles junction table (for multiple roles per user)
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

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default roles
INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at) VALUES
  ('admin', '관리자', '모든 권한을 가진 시스템 관리자', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('manager', '매니저', '사용자 및 컨텐츠 관리 권한', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user', '일반 사용자', '기본 사용 권한', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('guest', '게스트', '제한된 읽기 권한', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default permissions
INSERT OR IGNORE INTO permissions (id, name, description, category, created_at, updated_at) VALUES
  -- System permissions
  ('system.admin', '시스템 관리', '시스템 전체 관리 권한', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system.settings', '설정 관리', '시스템 설정 변경 권한', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- User management permissions
  ('users.create', '사용자 생성', '새 사용자 계정 생성', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.read', '사용자 조회', '사용자 정보 조회', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.update', '사용자 수정', '사용자 정보 수정', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.delete', '사용자 삭제', '사용자 계정 삭제', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('users.manage_roles', '권한 관리', '사용자 권한 할당 및 변경', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Chat permissions
  ('chat.create', '채팅 생성', '새 채팅 세션 생성', 'chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('chat.read', '채팅 조회', '채팅 내역 조회', 'chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('chat.delete', '채팅 삭제', '채팅 세션 삭제', 'chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- RAG permissions
  ('rag.create', 'RAG 생성', 'RAG 시스템 설정 생성', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rag.read', 'RAG 조회', 'RAG 설정 조회', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rag.update', 'RAG 수정', 'RAG 설정 수정', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rag.delete', 'RAG 삭제', 'RAG 설정 삭제', 'rag', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- API permissions
  ('api.create', 'API 키 생성', 'API 접근 키 생성', 'api', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('api.manage', 'API 관리', 'API 설정 관리', 'api', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

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

-- Migrate existing user roles to new system
INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at)
SELECT id, role, CURRENT_TIMESTAMP FROM users WHERE role IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Update system settings
UPDATE system_settings SET value = '1.9.0', updated_at = CURRENT_TIMESTAMP WHERE key = 'db_version';
