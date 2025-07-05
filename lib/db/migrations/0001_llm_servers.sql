-- LLM 서버 설정 테이블 생성
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

-- 기본 서버 설정 추가
INSERT INTO llm_servers (id, provider, name, base_url, api_key, models, enabled, is_default, created_at, updated_at)
VALUES 
    ('default-openai', 'openai', 'OpenAI', 'https://api.openai.com/v1', NULL, '["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"]', 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
    ('default-gemini', 'gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', NULL, '["gemini-pro", "gemini-pro-vision"]', 0, 0, strftime('%s', 'now'), strftime('%s', 'now')),
    ('default-ollama', 'ollama', 'Ollama Local', 'http://localhost:11434', NULL, '[]', 0, 0, strftime('%s', 'now'), strftime('%s', 'now'))
ON CONFLICT(id) DO NOTHING; 