// This file is for server-side only
import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../../config';
import * as schema from '../../schema';

// Get DB instance
const db = getDb();

// RAG Document related functions
export const ragDocumentRepository = {
  /**
   * Find all documents
   */
  findAll: async () => {
    return await db.select().from(schema.ragDocuments);
  },
  
  /**
   * Find all documents with collection info
   */
  findAllWithCollection: async (collectionId?: number, status?: string) => {
    let query = db
      .select({
        id: schema.ragDocuments.id,
        collectionId: schema.ragDocuments.collectionId,
        title: schema.ragDocuments.title,
        filename: schema.ragDocuments.filename,
        fileType: schema.ragDocuments.fileType,
        fileSize: schema.ragDocuments.fileSize,
        contentType: schema.ragDocuments.contentType,
        processingStatus: schema.ragDocuments.processingStatus,
        errorMessage: schema.ragDocuments.errorMessage,
        metadata: schema.ragDocuments.metadata,
        createdAt: schema.ragDocuments.createdAt,
        updatedAt: schema.ragDocuments.updatedAt,
        collectionName: schema.ragCollections.name,
      })
      .from(schema.ragDocuments)
      .innerJoin(schema.ragCollections, eq(schema.ragDocuments.collectionId, schema.ragCollections.id));
    
    if (collectionId) {
      query = query.where(eq(schema.ragDocuments.collectionId, collectionId));
    }
    
    if (status) {
      query = query.where(eq(schema.ragDocuments.processingStatus, status));
    }
    
    return await query;
  },
  
  /**
   * Find document by ID
   */
  findById: async (id: number) => {
    const result = await db.select().from(schema.ragDocuments).where(eq(schema.ragDocuments.id, id)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Find documents by collection ID
   */
  findByCollectionId: async (collectionId: number) => {
    return await db.select().from(schema.ragDocuments).where(eq(schema.ragDocuments.collectionId, collectionId));
  },
  
  /**
   * Create document
   */
  create: async (data: {
    collectionId: number;
    title: string;
    filename: string;
    fileType: string;
    fileSize: number;
    fileHash: string;
    contentType: string;
    rawContent?: string;
    metadata?: any;
    processingStatus?: string;
    errorMessage?: string;
  }) => {
    const now = new Date();
    
    return await db.insert(schema.ragDocuments).values({
      collectionId: data.collectionId,
      title: data.title,
      filename: data.filename,
      fileType: data.fileType,
      fileSize: data.fileSize,
      fileHash: data.fileHash,
      contentType: data.contentType,
      rawContent: data.rawContent,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      processingStatus: data.processingStatus || 'pending',
      errorMessage: data.errorMessage,
      createdAt: now,
      updatedAt: now
    }).returning();
  },
  
  /**
   * Update document
   */
  update: async (id: number, data: Partial<{
    title: string;
    rawContent: string;
    metadata: any;
    processingStatus: string;
    errorMessage: string;
  }>) => {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.rawContent !== undefined) updateData.rawContent = data.rawContent;
    if (data.metadata !== undefined) {
      // If metadata is already a string, don't stringify again
      updateData.metadata = typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata);
    }
    if (data.processingStatus !== undefined) updateData.processingStatus = data.processingStatus;
    if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;
    
    return await db.update(schema.ragDocuments)
      .set(updateData)
      .where(eq(schema.ragDocuments.id, id))
      .returning();
  },
  
  /**
   * Delete document
   */
  delete: async (id: number) => {
    return await db.delete(schema.ragDocuments).where(eq(schema.ragDocuments.id, id));
  }
};

// RAG Document Chunk related functions
export const ragDocumentChunkRepository = {
  /**
   * Find chunks by document ID
   */
  findByDocumentId: async (documentId: number) => {
    return await db.select().from(schema.ragDocumentChunks).where(eq(schema.ragDocumentChunks.documentId, documentId));
  },
  
  /**
   * Create multiple chunks
   */
  createMany: async (chunks: Array<{
    documentId: number;
    chunkIndex: number;
    content: string;
    cleanedContent?: string;
    embeddingVector?: string;
    metadata?: any;
    tokenCount?: number;
  }>) => {
    const now = new Date();
    
    return await db.insert(schema.ragDocumentChunks).values(
      chunks.map(chunk => ({
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        cleanedContent: chunk.cleanedContent,
        embeddingVector: chunk.embeddingVector,
        metadata: chunk.metadata ? JSON.stringify(chunk.metadata) : null,
        tokenCount: chunk.tokenCount || chunk.content.split(/\s+/).length,
        createdAt: now
      }))
    );
  },
  
  /**
   * Delete chunks by document ID
   */
  deleteByDocumentId: async (documentId: number) => {
    return await db.delete(schema.ragDocumentChunks).where(eq(schema.ragDocumentChunks.documentId, documentId));
  }
};
