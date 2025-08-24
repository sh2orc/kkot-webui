-- RAG System Tables Migration

-- Vector Store Configuration
CREATE TABLE IF NOT EXISTS rag_vector_stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('chromadb', 'pgvector', 'faiss')),
  connection_string TEXT,
  api_key TEXT,
  settings TEXT, -- JSON string for provider-specific settings
  enabled INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- RAG Collections
CREATE TABLE IF NOT EXISTS rag_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vector_store_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  embedding_dimensions INTEGER DEFAULT 1536,
  metadata TEXT, -- JSON string for collection metadata
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (vector_store_id) REFERENCES rag_vector_stores(id) ON DELETE CASCADE,
  UNIQUE (vector_store_id, name)
);

-- RAG Documents
CREATE TABLE IF NOT EXISTS rag_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT,
  content_type TEXT CHECK(content_type IN ('pdf', 'docx', 'pptx', 'txt', 'html', 'markdown', 'csv', 'json')),
  raw_content TEXT,
  metadata TEXT, -- JSON string for document metadata
  processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (collection_id) REFERENCES rag_collections(id) ON DELETE CASCADE
);

-- Document Chunks
CREATE TABLE IF NOT EXISTS rag_document_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  cleaned_content TEXT,
  embedding_vector TEXT, -- JSON array of embedding values
  metadata TEXT, -- JSON string for chunk metadata
  token_count INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE,
  UNIQUE (document_id, chunk_index)
);

-- Chunking Strategies
CREATE TABLE IF NOT EXISTS rag_chunking_strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('fixed_size', 'sentence', 'paragraph', 'semantic', 'sliding_window', 'custom')),
  chunk_size INTEGER DEFAULT 1000,
  chunk_overlap INTEGER DEFAULT 200,
  separator TEXT,
  custom_rules TEXT, -- JSON string for custom chunking rules
  is_default INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Data Cleansing Configurations
CREATE TABLE IF NOT EXISTS rag_cleansing_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  llm_model_id INTEGER,
  cleansing_prompt TEXT,
  remove_headers INTEGER DEFAULT 1,
  remove_footers INTEGER DEFAULT 1,
  remove_page_numbers INTEGER DEFAULT 1,
  normalize_whitespace INTEGER DEFAULT 1,
  fix_encoding INTEGER DEFAULT 1,
  custom_rules TEXT, -- JSON string for custom cleansing rules
  is_default INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (llm_model_id) REFERENCES llm_models(id) ON DELETE SET NULL
);

-- Batch Processing Jobs
CREATE TABLE IF NOT EXISTS rag_batch_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL CHECK(job_type IN ('import', 'reindex', 'cleanse', 'delete')),
  collection_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  settings TEXT, -- JSON string for job-specific settings
  error_log TEXT, -- JSON array of errors
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (collection_id) REFERENCES rag_collections(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rag_collections_vector_store ON rag_collections(vector_store_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_collection ON rag_documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_status ON rag_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document ON rag_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_batch_jobs_status ON rag_batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_rag_batch_jobs_collection ON rag_batch_jobs(collection_id);
