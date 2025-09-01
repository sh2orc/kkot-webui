-- ================================================
-- LLM Server and Model Related Tables
-- ================================================

-- LLM Server settings table
CREATE TABLE IF NOT EXISTS llm_servers (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'ollama', 'vllm', 'custom')),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT,
  models TEXT, -- JSON string of available models
  enabled INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  settings TEXT, -- JSON string for provider-specific settings
  created_at INTEGER,
  updated_at INTEGER
);

-- LLM Model management table
CREATE TABLE IF NOT EXISTS llm_models (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  is_public INTEGER DEFAULT 0,
  capabilities TEXT, -- JSON string
  context_length INTEGER,
  -- Image capabilities (0017 updated)
  supports_image_recognition INTEGER DEFAULT 0, -- Renamed from supports_multimodal
  supports_image_generation INTEGER DEFAULT 0, -- New feature
  -- Model type flags (0008)
  is_embedding_model INTEGER DEFAULT 0,
  is_reranking_model INTEGER DEFAULT 0,
  -- Timestamps
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (server_id) REFERENCES llm_servers(id) ON DELETE CASCADE
);

-- ================================================
-- INDEXES
-- ================================================

-- LLM Servers indexes
CREATE INDEX IF NOT EXISTS idx_llm_servers_provider ON llm_servers(provider);
CREATE INDEX IF NOT EXISTS idx_llm_servers_enabled ON llm_servers(enabled);
CREATE INDEX IF NOT EXISTS idx_llm_servers_is_default ON llm_servers(is_default);
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_servers_base_url_api_key ON llm_servers(base_url, api_key);

-- LLM Models indexes
CREATE INDEX IF NOT EXISTS idx_llm_models_server_id ON llm_models(server_id);
CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON llm_models(provider);
CREATE INDEX IF NOT EXISTS idx_llm_models_enabled ON llm_models(enabled);
CREATE INDEX IF NOT EXISTS idx_llm_models_is_public ON llm_models(is_public);
CREATE INDEX IF NOT EXISTS idx_llm_models_image_recognition ON llm_models(supports_image_recognition);
CREATE INDEX IF NOT EXISTS idx_llm_models_image_generation ON llm_models(supports_image_generation);
CREATE INDEX IF NOT EXISTS idx_llm_models_embedding ON llm_models(is_embedding_model);
CREATE INDEX IF NOT EXISTS idx_llm_models_reranking ON llm_models(is_reranking_model);
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_models_server_model ON llm_models(server_id, model_id);

-- ================================================
-- DEFAULT DATA
-- ================================================

-- Insert default LLM servers
INSERT OR IGNORE INTO llm_servers (id, provider, name, base_url, api_key, models, enabled, is_default, created_at, updated_at)
VALUES 
  ('default-openai', 'openai', 'OpenAI', 'https://api.openai.com/v1', NULL, '["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"]', 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('default-gemini', 'gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', NULL, '["gemini-pro", "gemini-pro-vision"]', 0, 0, strftime('%s', 'now'), strftime('%s', 'now')),
  ('default-ollama', 'ollama', 'Ollama Local', 'http://localhost:11434', NULL, '[]', 0, 0, strftime('%s', 'now'), strftime('%s', 'now'));
