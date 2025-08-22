// pgvector vector store implementation

import { BaseVectorStore } from './base';
import { Collection, DocumentChunk, SearchResult, VectorStoreConfig, VectorStoreError } from './types';

// PostgreSQL client type (will be imported from pg package when installed)
interface PgClient {
  query(text: string, values?: any[]): Promise<any>;
  end(): Promise<void>;
}

interface PgPool {
  query(text: string, values?: any[]): Promise<any>;
  end(): Promise<void>;
}

export class PgVectorStore extends BaseVectorStore {
  private pool: PgPool | null = null;

  constructor(config: VectorStoreConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    try {
      const { Pool } = await import('pg');
      
      if (!this.config.connectionString) {
        throw new VectorStoreError('PostgreSQL connection string is required', 'CONFIG_ERROR');
      }

      this.pool = new Pool({
        connectionString: this.config.connectionString,
      });

      // Test connection and ensure pgvector extension is installed
      await this.pool.query('SELECT 1');
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      
      // Create base tables if they don't exist
      await this.initializeTables();
      
      this.connected = true;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR'
      );
    }
  }

  private async initializeTables(): Promise<void> {
    // Create collections table
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS vector_collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        embedding_dimensions INTEGER NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create documents table
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS vector_documents (
        id VARCHAR(255) PRIMARY KEY,
        collection_id INTEGER REFERENCES vector_collections(id) ON DELETE CASCADE,
        document_id VARCHAR(255),
        chunk_index INTEGER,
        content TEXT NOT NULL,
        cleaned_content TEXT,
        embedding vector,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.pool!.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_documents_collection 
      ON vector_documents(collection_id)
    `);

    await this.pool!.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_documents_document 
      ON vector_documents(document_id)
    `);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }

  async createCollection(name: string, embeddingDimensions: number, metadata?: Record<string, any>): Promise<Collection> {
    this.ensureConnected();
    this.validateCollectionName(name);
    this.validateEmbeddingDimensions(embeddingDimensions);

    try {
      const result = await this.pool!.query(
        `INSERT INTO vector_collections (name, embedding_dimensions, metadata, description) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, description, metadata`,
        [name, embeddingDimensions, JSON.stringify(metadata || {}), metadata?.description]
      );

      const row = result.rows[0];
      return {
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        metadata: row.metadata,
      };
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new VectorStoreError(`Collection ${name} already exists`, 'COLLECTION_EXISTS');
      }
      throw new VectorStoreError(
        `Failed to create collection: ${error.message}`,
        'COLLECTION_CREATE_ERROR'
      );
    }
  }

  async deleteCollection(name: string): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(name);

    try {
      await this.pool!.query(
        'DELETE FROM vector_collections WHERE name = $1',
        [name]
      );
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to delete collection: ${error.message}`,
        'COLLECTION_DELETE_ERROR'
      );
    }
  }

  async listCollections(): Promise<Collection[]> {
    this.ensureConnected();

    try {
      const result = await this.pool!.query(
        'SELECT id, name, description, metadata FROM vector_collections ORDER BY name'
      );

      return result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        metadata: row.metadata,
      }));
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to list collections: ${error.message}`,
        'COLLECTION_LIST_ERROR'
      );
    }
  }

  async getCollection(name: string): Promise<Collection | null> {
    this.ensureConnected();
    this.validateCollectionName(name);

    try {
      const result = await this.pool!.query(
        'SELECT id, name, description, metadata FROM vector_collections WHERE name = $1',
        [name]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        metadata: row.metadata,
      };
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to get collection: ${error.message}`,
        'COLLECTION_GET_ERROR'
      );
    }
  }

  private async getCollectionId(name: string): Promise<number> {
    const result = await this.pool!.query(
      'SELECT id FROM vector_collections WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      throw new VectorStoreError(`Collection ${name} not found`, 'COLLECTION_NOT_FOUND');
    }

    return result.rows[0].id;
  }

  async addDocuments(collectionName: string, documents: DocumentChunk[]): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);
    this.validateDocuments(documents);

    try {
      const collectionId = await this.getCollectionId(collectionName);

      // Prepare bulk insert
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      documents.forEach((doc) => {
        const embeddingStr = doc.embedding ? `[${doc.embedding.join(',')}]` : null;
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
        );
        values.push(
          doc.id,
          collectionId,
          doc.documentId,
          doc.chunkIndex,
          doc.content,
          doc.cleanedContent,
          embeddingStr,
          JSON.stringify(doc.metadata || {})
        );
        paramIndex += 8;
      });

      const query = `
        INSERT INTO vector_documents 
        (id, collection_id, document_id, chunk_index, content, cleaned_content, embedding, metadata)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          cleaned_content = EXCLUDED.cleaned_content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata
      `;

      await this.pool!.query(query, values);
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to add documents: ${error.message}`,
        'DOCUMENT_ADD_ERROR'
      );
    }
  }

  async updateDocument(collectionName: string, documentId: string, document: Partial<DocumentChunk>): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    try {
      const collectionId = await this.getCollectionId(collectionName);

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (document.content !== undefined) {
        updates.push(`content = $${paramIndex}`);
        values.push(document.content);
        paramIndex++;
      }

      if (document.cleanedContent !== undefined) {
        updates.push(`cleaned_content = $${paramIndex}`);
        values.push(document.cleanedContent);
        paramIndex++;
      }

      if (document.embedding !== undefined) {
        updates.push(`embedding = $${paramIndex}`);
        values.push(`[${document.embedding.join(',')}]`);
        paramIndex++;
      }

      if (document.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(document.metadata));
        paramIndex++;
      }

      if (updates.length === 0) {
        return;
      }

      values.push(documentId);
      values.push(collectionId);

      await this.pool!.query(
        `UPDATE vector_documents 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} AND collection_id = $${paramIndex + 1}`,
        values
      );
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to update document: ${error.message}`,
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
      const collectionId = await this.getCollectionId(collectionName);
      
      const placeholders = documentIds.map((_, i) => `$${i + 2}`).join(', ');
      
      await this.pool!.query(
        `DELETE FROM vector_documents 
         WHERE collection_id = $1 AND id IN (${placeholders})`,
        [collectionId, ...documentIds]
      );
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to delete documents: ${error.message}`,
        'DOCUMENT_DELETE_ERROR'
      );
    }
  }

  async getDocument(collectionName: string, documentId: string): Promise<DocumentChunk | null> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    try {
      const collectionId = await this.getCollectionId(collectionName);
      
      const result = await this.pool!.query(
        `SELECT id, document_id, chunk_index, content, cleaned_content, 
                embedding, metadata
         FROM vector_documents 
         WHERE id = $1 AND collection_id = $2`,
        [documentId, collectionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        cleanedContent: row.cleaned_content,
        embedding: row.embedding ? Array.from(row.embedding) : undefined,
        metadata: row.metadata,
      };
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to get document: ${error.message}`,
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
      const collectionId = await this.getCollectionId(collectionName);
      
      let query = `
        SELECT id, document_id, content, metadata,
               1 - (embedding <=> $1::vector) as similarity
        FROM vector_documents
        WHERE collection_id = $2
      `;

      const values: any[] = [`[${queryEmbedding.join(',')}]`, collectionId];
      let paramIndex = 3;

      if (filter && Object.keys(filter).length > 0) {
        const filterConditions = Object.entries(filter).map(([key, value]) => {
          values.push(value);
          return `metadata->>'${key}' = $${paramIndex++}`;
        });
        query += ` AND ${filterConditions.join(' AND ')}`;
      }

      query += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`;
      values.push(topK);

      const result = await this.pool!.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        content: row.content,
        score: row.similarity,
        metadata: row.metadata,
      }));
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to search: ${error.message}`,
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
    // pgvector doesn't support text search without embeddings
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
      const collectionResult = await this.pool!.query(
        'SELECT id, embedding_dimensions FROM vector_collections WHERE name = $1',
        [collectionName]
      );

      if (collectionResult.rows.length === 0) {
        throw new VectorStoreError(`Collection ${collectionName} not found`, 'COLLECTION_NOT_FOUND');
      }

      const collection = collectionResult.rows[0];
      
      const countResult = await this.pool!.query(
        'SELECT COUNT(*) as count FROM vector_documents WHERE collection_id = $1',
        [collection.id]
      );

      // Check for IVFFLAT or HNSW index
      const indexResult = await this.pool!.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'vector_documents' 
        AND indexdef LIKE '%embedding%'
        AND (indexdef LIKE '%ivfflat%' OR indexdef LIKE '%hnsw%')
      `);

      let indexType = undefined;
      if (indexResult.rows.length > 0) {
        const indexDef = indexResult.rows[0].indexdef;
        if (indexDef.includes('ivfflat')) {
          indexType = 'IVFFlat';
        } else if (indexDef.includes('hnsw')) {
          indexType = 'HNSW';
        }
      }

      return {
        documentCount: parseInt(countResult.rows[0].count),
        dimensionality: collection.embedding_dimensions,
        indexType,
      };
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to get collection stats: ${error.message}`,
        'STATS_ERROR'
      );
    }
  }

  async createIndex(collectionName: string, indexType: string = 'ivfflat', params?: Record<string, any>): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    try {
      const collectionId = await this.getCollectionId(collectionName);
      const indexName = `idx_${collectionName}_embedding_${indexType}`;

      // Drop existing index if any
      await this.pool!.query(`DROP INDEX IF EXISTS ${indexName}`);

      let indexQuery: string;
      if (indexType === 'ivfflat') {
        const lists = params?.lists || 100;
        indexQuery = `
          CREATE INDEX ${indexName} 
          ON vector_documents 
          USING ivfflat (embedding vector_l2_ops) 
          WITH (lists = ${lists})
          WHERE collection_id = ${collectionId}
        `;
      } else if (indexType === 'hnsw') {
        const m = params?.m || 16;
        const efConstruction = params?.ef_construction || 64;
        indexQuery = `
          CREATE INDEX ${indexName} 
          ON vector_documents 
          USING hnsw (embedding vector_l2_ops) 
          WITH (m = ${m}, ef_construction = ${efConstruction})
          WHERE collection_id = ${collectionId}
        `;
      } else {
        throw new VectorStoreError(`Unsupported index type: ${indexType}`, 'INVALID_INDEX_TYPE');
      }

      await this.pool!.query(indexQuery);
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to create index: ${error.message}`,
        'INDEX_CREATE_ERROR'
      );
    }
  }

  async dropIndex(collectionName: string): Promise<void> {
    this.ensureConnected();
    this.validateCollectionName(collectionName);

    try {
      // Drop all vector indexes for this collection
      await this.pool!.query(`
        DO $$
        DECLARE
          idx RECORD;
        BEGIN
          FOR idx IN 
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'vector_documents' 
            AND indexname LIKE $1
          LOOP
            EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
          END LOOP;
        END $$;
      `, [`idx_${collectionName}_embedding_%`]);
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to drop index: ${error.message}`,
        'INDEX_DROP_ERROR'
      );
    }
  }
}
