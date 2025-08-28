// This file is for server-side only
import 'server-only';

import { eq, and } from 'drizzle-orm';
import { getDb } from '../../config';
import * as schema from '../../schema';

// Get DB instance
const db = getDb();

// RAG Reranking Strategy related functions
export const ragRerankingStrategyRepository = {
  /**
   * Find all reranking strategies
   */
  findAll: async () => {
    return await db.select().from(schema.ragRerankingStrategies);
  },
  
  /**
   * Find all reranking strategies with model information
   */
  findAllWithModel: async () => {
    return await db
      .select({
        id: schema.ragRerankingStrategies.id,
        name: schema.ragRerankingStrategies.name,
        type: schema.ragRerankingStrategies.type,
        rerankingModelId: schema.ragRerankingStrategies.rerankingModelId,
        topK: schema.ragRerankingStrategies.topK,
        minScore: schema.ragRerankingStrategies.minScore,
        settings: schema.ragRerankingStrategies.settings,
        isDefault: schema.ragRerankingStrategies.isDefault,
        createdAt: schema.ragRerankingStrategies.createdAt,
        updatedAt: schema.ragRerankingStrategies.updatedAt,
        modelName: schema.llmModels.modelId,
        modelProvider: schema.llmModels.provider,
      })
      .from(schema.ragRerankingStrategies)
      .leftJoin(schema.llmModels, eq(schema.ragRerankingStrategies.rerankingModelId, schema.llmModels.id));
  },
  
  /**
   * Find reranking strategy by ID
   */
  findById: async (id: number) => {
    const result = await db.select().from(schema.ragRerankingStrategies).where(eq(schema.ragRerankingStrategies.id, id)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Find reranking strategy by ID with model information
   */
  findByIdWithModel: async (id: number) => {
    const result = await db
      .select({
        id: schema.ragRerankingStrategies.id,
        name: schema.ragRerankingStrategies.name,
        type: schema.ragRerankingStrategies.type,
        rerankingModelId: schema.ragRerankingStrategies.rerankingModelId,
        topK: schema.ragRerankingStrategies.topK,
        minScore: schema.ragRerankingStrategies.minScore,
        settings: schema.ragRerankingStrategies.settings,
        isDefault: schema.ragRerankingStrategies.isDefault,
        createdAt: schema.ragRerankingStrategies.createdAt,
        updatedAt: schema.ragRerankingStrategies.updatedAt,
        modelName: schema.llmModels.modelId,
        modelProvider: schema.llmModels.provider,
      })
      .from(schema.ragRerankingStrategies)
      .leftJoin(schema.llmModels, eq(schema.ragRerankingStrategies.rerankingModelId, schema.llmModels.id))
      .where(eq(schema.ragRerankingStrategies.id, id))
      .limit(1);
    return result[0] || null;
  },
  
  /**
   * Find default reranking strategy
   */
  findDefault: async () => {
    const result = await db.select().from(schema.ragRerankingStrategies).where(eq(schema.ragRerankingStrategies.isDefault, true)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Create reranking strategy
   */
  create: async (data: {
    name: string;
    type: string;
    rerankingModelId?: number;
    topK?: number;
    minScore?: number | string;
    settings?: any;
    isDefault?: boolean;
  }) => {
    const now = new Date();
    
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(schema.ragRerankingStrategies)
        .set({ isDefault: false })
        .where(eq(schema.ragRerankingStrategies.isDefault, true));
    }
    
    return await db.insert(schema.ragRerankingStrategies).values({
      name: data.name,
      type: data.type,
      rerankingModelId: data.rerankingModelId || null,
      topK: data.topK || 10,
      minScore: data.minScore ? String(data.minScore) : null,
      settings: data.settings ? JSON.stringify(data.settings) : null,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now
    }).returning();
  },
  
  /**
   * Update reranking strategy
   */
  update: async (id: number, data: Partial<{
    name: string;
    type: string;
    rerankingModelId: number | null;
    topK: number;
    minScore: number | string | null;
    settings: any;
    isDefault: boolean;
  }>) => {
    const updateData: any = { updatedAt: new Date() };
    
    // If this is set as default, unset other defaults
    if (data.isDefault === true) {
      await db
        .update(schema.ragRerankingStrategies)
        .set({ isDefault: false })
        .where(eq(schema.ragRerankingStrategies.isDefault, true));
    }
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.rerankingModelId !== undefined) updateData.rerankingModelId = data.rerankingModelId;
    if (data.topK !== undefined) updateData.topK = data.topK;
    if (data.minScore !== undefined) updateData.minScore = data.minScore ? String(data.minScore) : null;
    if (data.settings !== undefined) updateData.settings = JSON.stringify(data.settings);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    
    return await db.update(schema.ragRerankingStrategies)
      .set(updateData)
      .where(eq(schema.ragRerankingStrategies.id, id))
      .returning();
  },
  
  /**
   * Delete reranking strategy
   */
  delete: async (id: number) => {
    return await db.delete(schema.ragRerankingStrategies).where(eq(schema.ragRerankingStrategies.id, id));
  }
};
