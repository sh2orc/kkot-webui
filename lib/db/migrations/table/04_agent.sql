-- ================================================
-- Agent Management Table
-- ================================================

-- Agent management table
CREATE TABLE IF NOT EXISTS agent_manage (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  agent_id TEXT NOT NULL UNIQUE,
  model_id TEXT NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT,
  temperature TEXT DEFAULT '0.7',
  top_k INTEGER DEFAULT 50,
  top_p TEXT DEFAULT '0.95',
  max_tokens INTEGER DEFAULT 2048,
  presence_penalty TEXT DEFAULT '0.0',
  frequency_penalty TEXT DEFAULT '0.0',
  image_data BLOB,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  parameter_enabled INTEGER DEFAULT 1,
  -- Feature support flags
  supports_multimodal INTEGER DEFAULT 0, -- Keep for agent-specific multimodal support
  supports_deep_research INTEGER DEFAULT 1, -- Deep Research support
  supports_web_search INTEGER DEFAULT 1, -- Web Search support
  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (model_id) REFERENCES llm_models(id) ON DELETE CASCADE
);

-- ================================================
-- INDEXES
-- ================================================

-- Agent management indexes
CREATE INDEX IF NOT EXISTS idx_agent_manage_agent_id ON agent_manage(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_manage_model_id ON agent_manage(model_id);
CREATE INDEX IF NOT EXISTS idx_agent_manage_enabled ON agent_manage(enabled);
CREATE INDEX IF NOT EXISTS idx_agent_manage_multimodal ON agent_manage(supports_multimodal);
CREATE INDEX IF NOT EXISTS idx_agent_manage_deep_research ON agent_manage(supports_deep_research);
CREATE INDEX IF NOT EXISTS idx_agent_manage_web_search ON agent_manage(supports_web_search);
