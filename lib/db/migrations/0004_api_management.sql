-- API Management Migration
-- Add tables for API management, API keys, and API usage

-- API Management table for global API service settings
CREATE TABLE IF NOT EXISTS api_management (
  id TEXT PRIMARY KEY,
  api_enabled INTEGER DEFAULT 0,
  cors_enabled INTEGER DEFAULT 1,
  cors_origins TEXT DEFAULT '*',
  rate_limit_enabled INTEGER DEFAULT 1,
  rate_limit_requests INTEGER DEFAULT 1000,
  rate_limit_window INTEGER DEFAULT 3600, -- seconds
  require_auth INTEGER DEFAULT 1,
  openai_compatible INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- API Keys table for managing API access keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  user_id TEXT,
  permissions TEXT DEFAULT '["chat", "models"]', -- JSON array of permissions
  rate_limit_tier TEXT DEFAULT 'basic', -- basic, premium, unlimited
  max_requests_per_hour INTEGER DEFAULT 100,
  max_requests_per_day INTEGER DEFAULT 1000,
  allowed_ips TEXT, -- JSON array of allowed IPs
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API Usage table for tracking API usage
CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- Insert default API management settings
INSERT OR IGNORE INTO api_management (id, api_enabled, cors_enabled, cors_origins, rate_limit_enabled, rate_limit_requests, rate_limit_window, require_auth, openai_compatible, created_at, updated_at) 
VALUES ('default', 0, 1, '*', 1, 1000, 3600, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); 