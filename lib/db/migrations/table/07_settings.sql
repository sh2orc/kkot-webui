-- ================================================
-- System Settings and Configuration Tables
-- ================================================

-- API connection settings table
CREATE TABLE IF NOT EXISTS api_connections (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Model settings table
CREATE TABLE IF NOT EXISTS model_settings (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  temperature TEXT DEFAULT '0.7',
  max_tokens INTEGER DEFAULT 2048,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES api_connections(id) ON DELETE CASCADE
);

-- Web search settings table
CREATE TABLE IF NOT EXISTS web_search_settings (
  id TEXT PRIMARY KEY,
  engine TEXT DEFAULT 'searchxng',
  api_key TEXT,
  url TEXT,
  enabled INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Image generation settings table
CREATE TABLE IF NOT EXISTS image_settings (
  id TEXT PRIMARY KEY,
  provider TEXT DEFAULT 'openai',
  api_key TEXT,
  url TEXT,
  enabled INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Audio settings table
CREATE TABLE IF NOT EXISTS audio_settings (
  id TEXT PRIMARY KEY,
  provider TEXT DEFAULT 'openai',
  api_key TEXT,
  url TEXT,
  enabled INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMP
);

-- ================================================
-- INDEXES
-- ================================================

-- API connections indexes
CREATE INDEX IF NOT EXISTS idx_api_connections_type ON api_connections(type);
CREATE INDEX IF NOT EXISTS idx_api_connections_enabled ON api_connections(enabled);

-- Model settings indexes
CREATE INDEX IF NOT EXISTS idx_model_settings_connection_id ON model_settings(connection_id);
CREATE INDEX IF NOT EXISTS idx_model_settings_is_default ON model_settings(is_default);

-- Web search settings indexes
CREATE INDEX IF NOT EXISTS idx_web_search_settings_engine ON web_search_settings(engine);
CREATE INDEX IF NOT EXISTS idx_web_search_settings_enabled ON web_search_settings(enabled);

-- Image settings indexes
CREATE INDEX IF NOT EXISTS idx_image_settings_provider ON image_settings(provider);
CREATE INDEX IF NOT EXISTS idx_image_settings_enabled ON image_settings(enabled);

-- Audio settings indexes
CREATE INDEX IF NOT EXISTS idx_audio_settings_provider ON audio_settings(provider);
CREATE INDEX IF NOT EXISTS idx_audio_settings_enabled ON audio_settings(enabled);

-- System settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- ================================================
-- DEFAULT DATA
-- ================================================

-- Add default system settings
INSERT OR IGNORE INTO system_settings (id, key, value, updated_at) 
VALUES ('1', 'db_version', '1.0.0', CURRENT_TIMESTAMP);
