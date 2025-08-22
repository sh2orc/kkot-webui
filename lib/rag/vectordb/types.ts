// Vector database types and interfaces

export interface VectorStoreConfig {
  type: 'chromadb' | 'pgvector' | 'faiss';
  connectionString?: string;
  apiKey?: string;
  settings?: Record<string, any>;
}

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  cleanedContent?: string;
  chunkIndex: number;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface VectorStore {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Collection management
  createCollection(name: string, embeddingDimensions: number, metadata?: Record<string, any>): Promise<Collection>;
  deleteCollection(name: string): Promise<void>;
  listCollections(): Promise<Collection[]>;
  getCollection(name: string): Promise<Collection | null>;

  // Document operations
  addDocuments(collectionName: string, documents: DocumentChunk[]): Promise<void>;
  updateDocument(collectionName: string, documentId: string, document: Partial<DocumentChunk>): Promise<void>;
  deleteDocument(collectionName: string, documentId: string): Promise<void>;
  deleteDocuments(collectionName: string, documentIds: string[]): Promise<void>;
  getDocument(collectionName: string, documentId: string): Promise<DocumentChunk | null>;

  // Search operations
  search(
    collectionName: string, 
    queryEmbedding: number[], 
    topK: number, 
    filter?: Record<string, any>
  ): Promise<SearchResult[]>;
  
  searchByText(
    collectionName: string,
    queryText: string,
    topK: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]>;

  // Batch operations
  batchAddDocuments(collectionName: string, documents: DocumentChunk[], batchSize?: number): Promise<void>;
  batchDeleteDocuments(collectionName: string, documentIds: string[], batchSize?: number): Promise<void>;

  // Index management
  createIndex?(collectionName: string, indexType: string, params?: Record<string, any>): Promise<void>;
  dropIndex?(collectionName: string): Promise<void>;

  // Stats and info
  getCollectionStats(collectionName: string): Promise<{
    documentCount: number;
    dimensionality: number;
    indexType?: string;
  }>;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export class VectorStoreError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'VectorStoreError';
  }
}
