-- LLM 모델 관리 테이블 생성
CREATE TABLE IF NOT EXISTS llm_models (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    is_public INTEGER DEFAULT 0,
    capabilities TEXT, -- JSON string
    context_length INTEGER,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (server_id) REFERENCES llm_servers(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_llm_models_server_id ON llm_models(server_id);
CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON llm_models(provider);
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_models_server_model ON llm_models(server_id, model_id); 