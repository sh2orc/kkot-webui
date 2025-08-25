// ChromaDB vector store implementation

import { BaseVectorStore } from './base';
import { Collection, DocumentChunk, SearchResult, VectorStoreConfig, VectorStoreError } from './types';

// ChromaDB client type (will be imported from chromadb package when installed)
interface ChromaClient {
  heartbeat(): Promise<number>;
  createCollection(params: any): Promise<any>;
  deleteCollection(params: any): Promise<void>;
  listCollections(): Promise<any[]>;
  getCollection(params: any): Promise<any>;
}

export class ChromaDBVectorStore extends BaseVectorStore {
  private client: ChromaClient | null = null;
  private collections: Map<string, any> = new Map();

  constructor(config: VectorStoreConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid loading the library if not used
      const { ChromaClient } = await import('chromadb');
      
      const connectionUrl = this.config.connectionString || 'http://localhost:8000';
      const url = new URL(connectionUrl);
      
      const clientConfig: any = {
        host: url.hostname,
        port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 8000),
        ssl: url.protocol === 'https:',
      };

      if (this.config.apiKey) {
        clientConfig.auth = {
          provider: 'token',
          credentials: this.config.apiKey,
        };
      }

      this.client = new ChromaClient(clientConfig);
      
      // Test connection
      await this.client.heartbeat();
      this.connected = true;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to connect to ChromaDB: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR'
      );
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.collections.clear();
    this.connected = false;
  }

  async createCollection(name: string, embeddingDimensions: number, metadata?: Record<string, any>): Promise<Collection> {
    this.ensureConnected();
    this.validateCollectionName(name);
    this.validateEmbeddingDimensions(embeddingDimensions);

    try {
      // ChromaDB requires an embedding function, but we'll handle embeddings externally
      // So we use 'null' to indicate no default embedding function
      const collection = await this.client!.createCollection({
        name,
        metadata: {
          ...metadata,
          dimensions: embeddingDimensions,
        },
        embeddingFunction: null, // We'll provide embeddings directly
      });

      this.collections.set(name, collection);

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

    try {
      await this.client!.deleteCollection({ name });
      this.collections.delete(name);
    } catch (error) {
      throw new VectorStoreError(
        `Failed to delete collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COLLECTION_DELETE_ERROR'
      );
    }
  }

  async listCollections(): Promise<Collection[]> {
    this.ensureConnected();

    try {
      const collections = await this.client!.listCollections();
      return collections.map(col => ({
        id: col.name,
        name: col.name,
        metadata: col.metadata,
      }));
    } catch (error) {
      throw new VectorStoreError(
        `Failed to list collections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COLLECTION_LIST_ERROR'
      );
    }
  }

  async getCollection(name: string): Promise<Collection | null> {
    this.ensureConnected();
    this.validateCollectionName(name);

    try {
      const collection = await this.client!.getCollection({ name });
      if (!collection) return null;

      this.collections.set(name, collection);
      
      return {
        id: name,
        name,
        metadata: collection.metadata,
      };
    } catch (error) {
      // Collection not found
      if (error instanceof Error && error.message.includes('does not exist')) {
        return null;
      }
      throw new VectorStoreError(
        `Failed to get collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COLLECTION_GET_ERROR'
      );
    }
  }

  private async getOrLoadCollection(name: string): Promise<any> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    const collection = await this.client!.getCollection({ 
      name,
      embeddingFunction: null // We provide embeddings directly
    });
    if (!collection) {
      throw new VectorStoreError(`Collection ${name} not found`, 'COLLECTION_NOT_FOUND');
    }

    this.collections.set(name, collection);
    return collection;
  }

  async addDocuments(collectionName: string, documents: DocumentChunk[]): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);
    this.validateDocuments(documents);

    try {
      const collection = await this.getOrLoadCollection(collectionName);

      const ids = documents.map(doc => doc.id);
      const embeddings = documents.map(doc => {
        if (!doc.embedding) {
          throw new VectorStoreError(
            `Document ${doc.id} is missing embedding`,
            'MISSING_EMBEDDING'
          );
        }
        return doc.embedding;
      });
      const metadatas = documents.map(doc => ({
        ...doc.metadata,
        documentId: doc.documentId,
        chunkIndex: doc.chunkIndex,
      }));
      const contents = documents.map(doc => doc.content);

      await collection.add({
        ids,
        embeddings,
        metadatas,
        documents: contents,
      });
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

    try {
      const collection = await this.getOrLoadCollection(collectionName);

      const updateData: any = {
        ids: [documentId],
      };

      if (document.embedding) {
        updateData.embeddings = [document.embedding];
      }

      if (document.metadata || document.documentId !== undefined || document.chunkIndex !== undefined) {
        const existingDoc = await this.getDocument(collectionName, documentId);
        updateData.metadatas = [{
          ...existingDoc?.metadata,
          ...document.metadata,
          documentId: document.documentId ?? existingDoc?.documentId,
          chunkIndex: document.chunkIndex ?? existingDoc?.chunkIndex,
        }];
      }

      if (document.content) {
        updateData.documents = [document.content];
      }

      await collection.update(updateData);
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

    if (documentIds.length === 0) return;

    try {
      const collection = await this.getOrLoadCollection(collectionName);
      await collection.delete({ ids: documentIds });
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

    try {
      const collection = await this.getOrLoadCollection(collectionName);
      const result = await collection.get({
        ids: [documentId],
        include: ['embeddings', 'metadatas', 'documents'],
      });

      if (!result.ids || result.ids.length === 0) {
        return null;
      }

      const metadata = result.metadatas?.[0] || {};
      return {
        id: result.ids[0],
        documentId: metadata.documentId,
        chunkIndex: metadata.chunkIndex,
        content: result.documents?.[0] || '',
        embedding: result.embeddings?.[0],
        metadata: metadata,
      };
    } catch (error) {
      throw new VectorStoreError(
        `Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOCUMENT_GET_ERROR'
      );
    }
  }

  async search(
    collectionName: string,
    queryEmbedding: number[],
    topK: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    try {
      const collection = await this.getOrLoadCollection(collectionName);
      
      const queryParams: any = {
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        include: ['embeddings', 'metadatas', 'documents', 'distances'],
      };

      if (filter) {
        queryParams.whereDocument = filter;
      }

      const result = await collection.query(queryParams);

      if (!result.ids || result.ids[0].length === 0) {
        return [];
      }

      return result.ids[0].map((id, index) => {
        const metadata = result.metadatas?.[0]?.[index] || {};
        return {
          id,
          documentId: metadata.documentId,
          content: result.documents?.[0]?.[index] || '',
          score: 1 - (result.distances?.[0]?.[index] || 0), // Convert distance to similarity score
          metadata,
        };
      });
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
    // ChromaDB doesn't support text search without embeddings
    // This would need to be implemented with an embedding service
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

    try {
      const collection = await this.getOrLoadCollection(collectionName);
      const count = await collection.count();
      const metadata = collection.metadata || {};

      return {
        documentCount: count,
        dimensionality: metadata.dimensions || 0,
        indexType: 'HNSW', // ChromaDB uses HNSW by default
      };
    } catch (error) {
      throw new VectorStoreError(
        `Failed to get collection stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STATS_ERROR'
      );
    }
  }
}
