-- Add chunking strategy reference to collections
ALTER TABLE rag_collections 
ADD COLUMN default_chunking_strategy_id INTEGER REFERENCES rag_chunking_strategies(id) ON DELETE SET NULL;

-- Add cleansing config reference to collections
ALTER TABLE rag_collections 
ADD COLUMN default_cleansing_config_id INTEGER REFERENCES rag_cleansing_configs(id) ON DELETE SET NULL;

-- Add chunking strategy override to documents
ALTER TABLE rag_documents
ADD COLUMN chunking_strategy_id INTEGER REFERENCES rag_chunking_strategies(id) ON DELETE SET NULL;

-- Add cleansing config override to documents
ALTER TABLE rag_documents
ADD COLUMN cleansing_config_id INTEGER REFERENCES rag_cleansing_configs(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rag_collections_chunking_strategy ON rag_collections(default_chunking_strategy_id);
CREATE INDEX IF NOT EXISTS idx_rag_collections_cleansing_config ON rag_collections(default_cleansing_config_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_chunking_strategy ON rag_documents(chunking_strategy_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_cleansing_config ON rag_documents(cleansing_config_id);

-- Insert default chunking strategy if none exists
INSERT OR IGNORE INTO rag_chunking_strategies (
  name, 
  type, 
  chunk_size, 
  chunk_overlap, 
  is_default,
  created_at,
  updated_at
) VALUES (
  'Default Fixed Size',
  'fixed_size',
  1000,
  200,
  1,
  datetime('now'),
  datetime('now')
);

-- Insert default cleansing config if none exists
INSERT OR IGNORE INTO rag_cleansing_configs (
  name,
  remove_headers,
  remove_footers,
  remove_page_numbers,
  normalize_whitespace,
  fix_encoding,
  is_default,
  created_at,
  updated_at
) VALUES (
  'Default Cleansing',
  1,
  1,
  1,
  1,
  1,
  1,
  datetime('now'),
  datetime('now')
);
