// Vector database exports

export * from './types';
export * from './base';
export * from './chromadb';
export * from './pgvector';
export * from './faiss';
export * from './factory';

// Re-export commonly used types for convenience
export type {
  VectorStore,
  VectorStoreConfig,
  EmbeddingConfig,
  Document,
  DocumentChunk,
  SearchResult,
  Collection,
  EmbeddingProvider,
} from './types';

export { VectorStoreError } from './types';
export { BaseVectorStore } from './base';
export { VectorStoreFactory } from './factory';
