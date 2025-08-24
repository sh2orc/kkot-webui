// This file is for server-side only
import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../../config';
import * as schema from '../../schema';

// Get DB instance
const db = getDb();

// RAG Collection related functions
export const ragCollectionRepository = {
  /**
   * Find all collections
   */
  findAll: async () => {
    return await db.select().from(schema.ragCollections);
  },
  
  /**
   * Find all collections with vector store info
   */
  findAllWithVectorStore: async (vectorStoreId?: number) => {
    let query = db
      .select({
        id: schema.ragCollections.id,
        vectorStoreId: schema.ragCollections.vectorStoreId,
        name: schema.ragCollections.name,
        description: schema.ragCollections.description,
        embeddingModel: schema.ragCollections.embeddingModel,
        embeddingDimensions: schema.ragCollections.embeddingDimensions,
        metadata: schema.ragCollections.metadata,
        isActive: schema.ragCollections.isActive,
        createdAt: schema.ragCollections.createdAt,
        updatedAt: schema.ragCollections.updatedAt,
        vectorStoreName: schema.ragVectorStores.name,
        vectorStoreType: schema.ragVectorStores.type,
      })
      .from(schema.ragCollections)
      .innerJoin(schema.ragVectorStores, eq(schema.ragCollections.vectorStoreId, schema.ragVectorStores.id));
    
    if (vectorStoreId) {
      query = query.where(eq(schema.ragCollections.vectorStoreId, vectorStoreId));
    }
    
    return await query;
  },
  
  /**
   * Find collection by ID
   */
  findById: async (id: number) => {
    const result = await db.select().from(schema.ragCollections).where(eq(schema.ragCollections.id, id)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Find collection by ID with vector store
   */
  findByIdWithVectorStore: async (id: number) => {
    const result = await db
      .select()
      .from(schema.ragCollections)
      .innerJoin(schema.ragVectorStores, eq(schema.ragCollections.vectorStoreId, schema.ragVectorStores.id))
      .where(eq(schema.ragCollections.id, id))
      .limit(1);
    return result[0] || null;
  },
  
  /**
   * Find collections by vector store ID
   */
  findByVectorStoreId: async (vectorStoreId: number) => {
    return await db.select().from(schema.ragCollections).where(eq(schema.ragCollections.vectorStoreId, vectorStoreId));
  },
  
  /**
   * Find active collections
   */
  findActive: async () => {
    return await db.select().from(schema.ragCollections).where(eq(schema.ragCollections.isActive, true));
  },
  
  /**
   * Create collection
   */
  create: async (data: {
    vectorStoreId: number;
    name: string;
    description?: string;
    embeddingModel?: string;
    embeddingDimensions?: number;
    metadata?: any;
    isActive?: boolean;
  }) => {
    const now = new Date();
    
    return await db.insert(schema.ragCollections).values({
      vectorStoreId: data.vectorStoreId,
      name: data.name,
      description: data.description,
      embeddingModel: data.embeddingModel || 'text-embedding-ada-002',
      embeddingDimensions: data.embeddingDimensions || 1536,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now
    }).returning();
  },
  
  /**
   * Update collection
   */
  update: async (id: number, data: Partial<{
    name: string;
    description: string;
    embeddingModel: string;
    embeddingDimensions: number;
    metadata: any;
    isActive: boolean;
  }>) => {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.embeddingModel !== undefined) updateData.embeddingModel = data.embeddingModel;
    if (data.embeddingDimensions !== undefined) updateData.embeddingDimensions = data.embeddingDimensions;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    return await db.update(schema.ragCollections)
      .set(updateData)
      .where(eq(schema.ragCollections.id, id))
      .returning();
  },
  
  /**
   * Delete collection
   */
  delete: async (id: number) => {
    return await db.delete(schema.ragCollections).where(eq(schema.ragCollections.id, id));
  }
};
