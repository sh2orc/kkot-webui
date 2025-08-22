// Base vector store implementation

import { VectorStore, VectorStoreConfig, DocumentChunk, SearchResult, Collection, VectorStoreError } from './types';

export abstract class BaseVectorStore implements VectorStore {
  protected config: VectorStoreConfig;
  protected connected: boolean = false;

  constructor(config: VectorStoreConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  isConnected(): boolean {
    return this.connected;
  }

  protected ensureConnected(): void {
    if (!this.connected) {
      throw new VectorStoreError('Vector store is not connected');
    }
  }

  // Abstract methods that must be implemented by subclasses
  abstract createCollection(name: string, embeddingDimensions: number, metadata?: Record<string, any>): Promise<Collection>;
  abstract deleteCollection(name: string): Promise<void>;
  abstract listCollections(): Promise<Collection[]>;
  abstract getCollection(name: string): Promise<Collection | null>;

  abstract addDocuments(collectionName: string, documents: DocumentChunk[]): Promise<void>;
  abstract updateDocument(collectionName: string, documentId: string, document: Partial<DocumentChunk>): Promise<void>;
  abstract deleteDocument(collectionName: string, documentId: string): Promise<void>;
  abstract deleteDocuments(collectionName: string, documentIds: string[]): Promise<void>;
  abstract getDocument(collectionName: string, documentId: string): Promise<DocumentChunk | null>;

  abstract search(
    collectionName: string, 
    queryEmbedding: number[], 
    topK: number, 
    filter?: Record<string, any>
  ): Promise<SearchResult[]>;

  abstract searchByText(
    collectionName: string,
    queryText: string,
    topK: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]>;

  abstract getCollectionStats(collectionName: string): Promise<{
    documentCount: number;
    dimensionality: number;
    indexType?: string;
  }>;

  // Default batch implementations that can be overridden
  async batchAddDocuments(collectionName: string, documents: DocumentChunk[], batchSize: number = 100): Promise<void> {
    this.ensureConnected();
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.addDocuments(collectionName, batch);
    }
  }

  async batchDeleteDocuments(collectionName: string, documentIds: string[], batchSize: number = 100): Promise<void> {
    this.ensureConnected();
    
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      await this.deleteDocuments(collectionName, batch);
    }
  }

  // Helper methods
  protected validateCollectionName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new VectorStoreError('Collection name must be a non-empty string');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new VectorStoreError('Collection name must contain only alphanumeric characters, hyphens, and underscores');
    }
  }

  protected validateEmbeddingDimensions(dimensions: number): void {
    if (!Number.isInteger(dimensions) || dimensions <= 0) {
      throw new VectorStoreError('Embedding dimensions must be a positive integer');
    }
  }

  protected validateDocuments(documents: DocumentChunk[]): void {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new VectorStoreError('Documents must be a non-empty array');
    }

    documents.forEach((doc, index) => {
      if (!doc.id || typeof doc.id !== 'string') {
        throw new VectorStoreError(`Document at index ${index} must have a valid id`);
      }
      if (!doc.content || typeof doc.content !== 'string') {
        throw new VectorStoreError(`Document at index ${index} must have valid content`);
      }
      if (doc.embedding && (!Array.isArray(doc.embedding) || doc.embedding.some(v => typeof v !== 'number'))) {
        throw new VectorStoreError(`Document at index ${index} has invalid embedding`);
      }
    });
  }
}
