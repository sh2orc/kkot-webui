// Vector store factory

import { VectorStore, VectorStoreConfig, VectorStoreError } from './types';
import { ChromaDBVectorStore } from './chromadb';
import { PgVectorStore } from './pgvector';
import { FaissVectorStore } from './faiss';

export class VectorStoreFactory {
  static async create(config: VectorStoreConfig): Promise<VectorStore> {
    let store: VectorStore;

    switch (config.type) {
      case 'chromadb':
        store = new ChromaDBVectorStore(config);
        break;
      
      case 'pgvector':
        store = new PgVectorStore(config);
        break;
      
      case 'faiss':
        store = new FaissVectorStore(config);
        break;
      
      default:
        throw new VectorStoreError(
          `Unsupported vector store type: ${config.type}`,
          'UNSUPPORTED_TYPE'
        );
    }

    // Auto-connect on creation
    await store.connect();
    
    return store;
  }

  static async createFromDatabase(vectorStoreId: number): Promise<VectorStore> {
    // This method would load configuration from database
    // Implementation would depend on the database access layer
    throw new VectorStoreError(
      'createFromDatabase not implemented yet',
      'NOT_IMPLEMENTED'
    );
  }
}
