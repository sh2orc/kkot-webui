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
        defaultChunkingStrategyId: schema.ragCollections.defaultChunkingStrategyId,
        defaultCleansingConfigId: schema.ragCollections.defaultCleansingConfigId,
        defaultRerankingStrategyId: schema.ragCollections.defaultRerankingStrategyId,
        metadata: schema.ragCollections.metadata,
        isActive: schema.ragCollections.isActive,
        createdAt: schema.ragCollections.createdAt,
        updatedAt: schema.ragCollections.updatedAt,
        vectorStoreName: schema.ragVectorStores.name,
        vectorStoreType: schema.ragVectorStores.type,
        chunkingStrategyName: schema.ragChunkingStrategies.name,
        cleansingConfigName: schema.ragCleansingConfigs.name,
        rerankingStrategyName: schema.ragRerankingStrategies.name,
      })
      .from(schema.ragCollections)
      .innerJoin(schema.ragVectorStores, eq(schema.ragCollections.vectorStoreId, schema.ragVectorStores.id))
      .leftJoin(schema.ragChunkingStrategies, eq(schema.ragCollections.defaultChunkingStrategyId, schema.ragChunkingStrategies.id))
      .leftJoin(schema.ragCleansingConfigs, eq(schema.ragCollections.defaultCleansingConfigId, schema.ragCleansingConfigs.id))
      .leftJoin(schema.ragRerankingStrategies, eq(schema.ragCollections.defaultRerankingStrategyId, schema.ragRerankingStrategies.id));
    
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
      .select({
        ragCollections: {
          id: schema.ragCollections.id,
          vectorStoreId: schema.ragCollections.vectorStoreId,
          name: schema.ragCollections.name,
          description: schema.ragCollections.description,
          embeddingModel: schema.ragCollections.embeddingModel,
          embeddingDimensions: schema.ragCollections.embeddingDimensions,
          defaultChunkingStrategyId: schema.ragCollections.defaultChunkingStrategyId,
          defaultCleansingConfigId: schema.ragCollections.defaultCleansingConfigId,
          defaultRerankingStrategyId: schema.ragCollections.defaultRerankingStrategyId,
          metadata: schema.ragCollections.metadata,
          isActive: schema.ragCollections.isActive,
          createdAt: schema.ragCollections.createdAt,
          updatedAt: schema.ragCollections.updatedAt,
        },
        ragVectorStores: {
          id: schema.ragVectorStores.id,
          name: schema.ragVectorStores.name,
          type: schema.ragVectorStores.type,
          connectionString: schema.ragVectorStores.connectionString,
          apiKey: schema.ragVectorStores.apiKey,
          settings: schema.ragVectorStores.settings,
          enabled: schema.ragVectorStores.enabled,
          createdAt: schema.ragVectorStores.createdAt,
          updatedAt: schema.ragVectorStores.updatedAt,
        }
      })
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
    defaultChunkingStrategyId?: number | null;
    defaultCleansingConfigId?: number | null;
    defaultRerankingStrategyId?: number | null;
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
      defaultChunkingStrategyId: data.defaultChunkingStrategyId,
      defaultCleansingConfigId: data.defaultCleansingConfigId,
      defaultRerankingStrategyId: data.defaultRerankingStrategyId,
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
    defaultChunkingStrategyId: number | null;
    defaultCleansingConfigId: number | null;
    defaultRerankingStrategyId: number | null;
    metadata: any;
    isActive: boolean;
  }>) => {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.embeddingModel !== undefined) updateData.embeddingModel = data.embeddingModel;
    if (data.embeddingDimensions !== undefined) updateData.embeddingDimensions = data.embeddingDimensions;
    if (data.defaultChunkingStrategyId !== undefined) updateData.defaultChunkingStrategyId = data.defaultChunkingStrategyId;
    if (data.defaultCleansingConfigId !== undefined) updateData.defaultCleansingConfigId = data.defaultCleansingConfigId;
    if (data.defaultRerankingStrategyId !== undefined) updateData.defaultRerankingStrategyId = data.defaultRerankingStrategyId;
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
