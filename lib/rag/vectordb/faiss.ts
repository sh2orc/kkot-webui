// Faiss vector store implementation

import { BaseVectorStore } from './base';
import { Collection, DocumentChunk, SearchResult, VectorStoreConfig, VectorStoreError } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Faiss types (will be imported from faiss-node package when installed)
interface FaissIndex {
  add(vectors: number[][]): void;
  search(vectors: number[][], k: number): { distances: number[][], labels: number[][] };
  ntotal(): number;
  write(filename: string): void;
  read(filename: string): void;
}

interface CollectionMetadata {
  name: string;
  description?: string;
  embeddingDimensions: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentMetadata {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  cleanedContent?: string;
  metadata?: Record<string, any>;
}

export class FaissVectorStore extends BaseVectorStore {
  private indexes: Map<string, FaissIndex> = new Map();
  private collections: Map<string, CollectionMetadata> = new Map();
  private documents: Map<string, Map<string, DocumentMetadata>> = new Map();
  private dataPath: string;

  constructor(config: VectorStoreConfig) {
    super(config);
    this.dataPath = config.connectionString || './faiss_data';
  }

  async connect(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Load existing collections
      await this.loadCollections();
      
      this.connected = true;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to connect to Faiss: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR'
      );
    }
  }

  async disconnect(): Promise<void> {
    // Save all collections before disconnecting
    await this.saveCollections();
    
    this.indexes.clear();
    this.collections.clear();
    this.documents.clear();
    this.connected = false;
  }

  private async loadCollections(): Promise<void> {
    try {
      const metadataPath = path.join(this.dataPath, 'collections.json');
      const exists = await fs.access(metadataPath).then(() => true).catch(() => false);
      
      if (exists) {
        const data = await fs.readFile(metadataPath, 'utf-8');
        const collectionsData = JSON.parse(data);
        
        for (const [name, metadata] of Object.entries(collectionsData)) {
          this.collections.set(name, metadata as CollectionMetadata);
          
          // Load documents
          const docsPath = path.join(this.dataPath, `${name}_documents.json`);
          const docsExists = await fs.access(docsPath).then(() => true).catch(() => false);
          
          if (docsExists) {
            const docsData = await fs.readFile(docsPath, 'utf-8');
            const documents = new Map(JSON.parse(docsData));
            this.documents.set(name, documents);
          }
          
          // Load index
          const indexPath = path.join(this.dataPath, `${name}.index`);
          const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
          
          if (indexExists) {
            const { IndexFlatL2 } = await import('faiss-node');
            const index = new IndexFlatL2((metadata as CollectionMetadata).embeddingDimensions);
            index.read(indexPath);
            this.indexes.set(name, index);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  }

  private async saveCollections(): Promise<void> {
    try {
      // Save collections metadata
      const collectionsData = Object.fromEntries(this.collections);
      await fs.writeFile(
        path.join(this.dataPath, 'collections.json'),
        JSON.stringify(collectionsData, null, 2)
      );
      
      // Save documents and indexes for each collection
      for (const [name, _] of this.collections) {
        // Save documents
        const docs = this.documents.get(name);
        if (docs) {
          await fs.writeFile(
            path.join(this.dataPath, `${name}_documents.json`),
            JSON.stringify(Array.from(docs.entries()), null, 2)
          );
        }
        
        // Save index
        const index = this.indexes.get(name);
        if (index) {
          index.write(path.join(this.dataPath, `${name}.index`));
        }
      }
    } catch (error) {
      console.error('Failed to save collections:', error);
    }
  }

  async createCollection(name: string, embeddingDimensions: number, metadata?: Record<string, any>): Promise<Collection> {
    this.ensureConnected();
    this.validateCollectionName(name);
    this.validateEmbeddingDimensions(embeddingDimensions);

    if (this.collections.has(name)) {
      throw new VectorStoreError(`Collection ${name} already exists`, 'COLLECTION_EXISTS');
    }

    try {
      // Create Faiss index
      const { IndexFlatL2 } = await import('faiss-node');
      const index = new IndexFlatL2(embeddingDimensions);
      
      const collectionMetadata: CollectionMetadata = {
        name,
        description: metadata?.description,
        embeddingDimensions,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.indexes.set(name, index);
      this.collections.set(name, collectionMetadata);
      this.documents.set(name, new Map());
      
      // Save to disk
      await this.saveCollections();
      
      return {
        id: name,
        name,
        description: metadata?.description,
        metadata,
      };
    } catch (error) {
      throw new VectorStoreError(
        `Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COLLECTION_CREATE_ERROR'
      );
    }
  }

  async deleteCollection(name: string): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(name);

    if (!this.collections.has(name)) {
      return;
    }

    try {
      this.indexes.delete(name);
      this.collections.delete(name);
      this.documents.delete(name);
      
      // Delete files
      await fs.unlink(path.join(this.dataPath, `${name}.index`)).catch(() => {});
      await fs.unlink(path.join(this.dataPath, `${name}_documents.json`)).catch(() => {});
      
      await this.saveCollections();
    } catch (error) {
      throw new VectorStoreError(
        `Failed to delete collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COLLECTION_DELETE_ERROR'
      );
    }
  }

  async listCollections(): Promise<Collection[]> {
    this.ensureConnected();

    return Array.from(this.collections.entries()).map(([name, metadata]) => ({
      id: name,
      name,
      description: metadata.description,
      metadata: metadata.metadata,
    }));
  }

  async getCollection(name: string): Promise<Collection | null> {
    this.ensureConnected();
    this.validateCollectionName(name);

    const metadata = this.collections.get(name);
    if (!metadata) {
      return null;
    }

    return {
      id: name,
      name,
      description: metadata.description,
      metadata: metadata.metadata,
    };
  }

  async addDocuments(collectionName: string, documents: DocumentChunk[]): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);
    this.validateDocuments(documents);

    const collection = this.collections.get(collectionName);
    if (!collection) {
      throw new VectorStoreError(`Collection ${collectionName} not found`, 'COLLECTION_NOT_FOUND');
    }

    const index = this.indexes.get(collectionName);
    if (!index) {
      throw new VectorStoreError(`Index for collection ${collectionName} not found`, 'INDEX_NOT_FOUND');
    }

    const collectionDocs = this.documents.get(collectionName) || new Map();

    try {
      // Add embeddings to index
      const embeddings = documents
        .filter(doc => doc.embedding)
        .map(doc => doc.embedding!);
      
      if (embeddings.length > 0) {
        index.add(embeddings);
      }

      // Store document metadata
      documents.forEach((doc) => {
        const metadata: DocumentMetadata = {
          id: doc.id,
          documentId: doc.documentId,
          chunkIndex: doc.chunkIndex,
          content: doc.content,
          cleanedContent: doc.cleanedContent,
          metadata: doc.metadata,
        };
        collectionDocs.set(doc.id, metadata);
      });

      this.documents.set(collectionName, collectionDocs);
      
      // Update collection timestamp
      collection.updatedAt = new Date();
      
      // Save to disk
      await this.saveCollections();
    } catch (error) {
      throw new VectorStoreError(
        `Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOCUMENT_ADD_ERROR'
      );
    }
  }

  async updateDocument(collectionName: string, documentId: string, document: Partial<DocumentChunk>): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    const collectionDocs = this.documents.get(collectionName);
    if (!collectionDocs) {
      throw new VectorStoreError(`Collection ${collectionName} not found`, 'COLLECTION_NOT_FOUND');
    }

    const existingDoc = collectionDocs.get(documentId);
    if (!existingDoc) {
      throw new VectorStoreError(`Document ${documentId} not found`, 'DOCUMENT_NOT_FOUND');
    }

    try {
      // Update document metadata
      if (document.content !== undefined) existingDoc.content = document.content;
      if (document.cleanedContent !== undefined) existingDoc.cleanedContent = document.cleanedContent;
      if (document.metadata !== undefined) existingDoc.metadata = document.metadata;

      // Note: Faiss doesn't support updating embeddings in-place
      // Would need to rebuild the entire index to update embeddings
      if (document.embedding) {
        console.warn('Updating embeddings in Faiss requires rebuilding the entire index');
      }

      await this.saveCollections();
    } catch (error) {
      throw new VectorStoreError(
        `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOCUMENT_UPDATE_ERROR'
      );
    }
  }

  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    await this.deleteDocuments(collectionName, [documentId]);
  }

  async deleteDocuments(collectionName: string, documentIds: string[]): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    const collectionDocs = this.documents.get(collectionName);
    if (!collectionDocs) {
      throw new VectorStoreError(`Collection ${collectionName} not found`, 'COLLECTION_NOT_FOUND');
    }

    try {
      documentIds.forEach(id => collectionDocs.delete(id));
      
      // Note: Faiss doesn't support removing vectors from index
      // Would need to rebuild the entire index
      console.warn('Deleting documents from Faiss requires rebuilding the entire index');
      
      await this.saveCollections();
    } catch (error) {
      throw new VectorStoreError(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOCUMENT_DELETE_ERROR'
      );
    }
  }

  async getDocument(collectionName: string, documentId: string): Promise<DocumentChunk | null> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    const collectionDocs = this.documents.get(collectionName);
    if (!collectionDocs) {
      return null;
    }

    const doc = collectionDocs.get(documentId);
    if (!doc) {
      return null;
    }

    return {
      id: doc.id,
      documentId: doc.documentId,
      chunkIndex: doc.chunkIndex,
      content: doc.content,
      cleanedContent: doc.cleanedContent,
      metadata: doc.metadata,
    };
  }

  async search(
    collectionName: string,
    queryEmbedding: number[],
    topK: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    const index = this.indexes.get(collectionName);
    if (!index) {
      throw new VectorStoreError(`Index for collection ${collectionName} not found`, 'INDEX_NOT_FOUND');
    }

    const collectionDocs = this.documents.get(collectionName);
    if (!collectionDocs) {
      return [];
    }

    try {
      const result = index.search([queryEmbedding], topK);
      const distances = result.distances[0];
      const labels = result.labels[0];

      const results: SearchResult[] = [];
      const docArray = Array.from(collectionDocs.values());

      for (let i = 0; i < labels.length; i++) {
        const idx = labels[i];
        if (idx >= 0 && idx < docArray.length) {
          const doc = docArray[idx];
          
          // Apply filter if provided
          if (filter && doc.metadata) {
            let matchesFilter = true;
            for (const [key, value] of Object.entries(filter)) {
              if (doc.metadata[key] !== value) {
                matchesFilter = false;
                break;
              }
            }
            if (!matchesFilter) continue;
          }

          results.push({
            id: doc.id,
            documentId: doc.documentId,
            content: doc.content,
            score: 1 / (1 + distances[i]), // Convert distance to similarity score
            metadata: doc.metadata,
          });
        }
      }

      return results;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEARCH_ERROR'
      );
    }
  }

  async searchByText(
    collectionName: string,
    queryText: string,
    topK: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    // Faiss doesn't support text search without embeddings
    throw new VectorStoreError(
      'Text search requires embedding service configuration',
      'NOT_IMPLEMENTED'
    );
  }

  async getCollectionStats(collectionName: string): Promise<{
    documentCount: number;
    dimensionality: number;
    indexType?: string;
  }> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    const collection = this.collections.get(collectionName);
    if (!collection) {
      throw new VectorStoreError(`Collection ${collectionName} not found`, 'COLLECTION_NOT_FOUND');
    }

    const docs = this.documents.get(collectionName);
    const index = this.indexes.get(collectionName);

    return {
      documentCount: docs?.size || 0,
      dimensionality: collection.embeddingDimensions,
      indexType: 'Flat', // Faiss IndexFlatL2
    };
  }
}
