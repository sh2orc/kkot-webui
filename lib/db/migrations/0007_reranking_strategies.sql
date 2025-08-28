-- Create reranking strategies table
CREATE TABLE IF NOT EXISTS rag_reranking_strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('model_based', 'rule_based', 'hybrid', 'none')),
    reranking_model_id INTEGER REFERENCES llm_models(id) ON DELETE SET NULL,
    top_k INTEGER DEFAULT 10,
    min_score TEXT, -- Store as text for decimal precision
    settings TEXT, -- JSON string
    is_default INTEGER DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Add default_reranking_strategy_id to rag_collections
ALTER TABLE rag_collections ADD COLUMN default_reranking_strategy_id INTEGER REFERENCES rag_reranking_strategies(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rag_reranking_strategies_type ON rag_reranking_strategies(type);
CREATE INDEX IF NOT EXISTS idx_rag_reranking_strategies_is_default ON rag_reranking_strategies(is_default);

-- Insert default reranking strategy
INSERT INTO rag_reranking_strategies (name, type, is_default, created_at, updated_at)
VALUES ('No Reranking', 'none', 1, unixepoch(), unixepoch());
