-- SQLite and PostgreSQL compatible migration file
-- Table creation

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Chat messages table with multimodal support
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- 'text' or 'multimodal'
  attachments TEXT, -- JSON string for multimodal content
  rating INTEGER DEFAULT 0, -- -1 (dislike), 0 (neutral), +1 (like)
  created_at TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_type ON chat_messages(content_type);

-- Add default data
INSERT OR IGNORE INTO system_settings (id, key, value, updated_at) 
VALUES ('1', 'db_version', '1.0.0', CURRENT_TIMESTAMP); 