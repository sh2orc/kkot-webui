-- Drop and recreate agent_manage table
-- Add agent_manage table
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
  supports_multimodal INTEGER DEFAULT 0, -- 멀티모달 지원 여부
  supports_deep_research INTEGER DEFAULT 1, -- Deep Research 지원 여부
  supports_web_search INTEGER DEFAULT 1, -- Web Search 지원 여부
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (model_id) REFERENCES llm_models(id) ON DELETE CASCADE
);

-- Create index for model_id (IF NOT EXISTS 추가)
CREATE INDEX IF NOT EXISTS idx_agent_manage_model_id ON agent_manage(model_id);

-- Create index for enabled status (IF NOT EXISTS 추가)
CREATE INDEX IF NOT EXISTS idx_agent_manage_enabled ON agent_manage(enabled);

-- Create index for agent_id (IF NOT EXISTS 추가)
CREATE INDEX IF NOT EXISTS idx_agent_manage_agent_id ON agent_manage(agent_id);

-- Create index for multimodal support
CREATE INDEX IF NOT EXISTS idx_agent_manage_multimodal ON agent_manage(supports_multimodal);

-- Create index for deep research support
CREATE INDEX IF NOT EXISTS idx_agent_manage_deep_research ON agent_manage(supports_deep_research);

-- Create index for web search support
CREATE INDEX IF NOT EXISTS idx_agent_manage_web_search ON agent_manage(supports_web_search); 