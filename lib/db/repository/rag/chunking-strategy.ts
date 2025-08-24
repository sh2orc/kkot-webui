// This file is for server-side only
import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../../config';
import * as schema from '../../schema';

// Get DB instance
const db = getDb();

// RAG Chunking Strategy related functions
export const ragChunkingStrategyRepository = {
  /**
   * Find all chunking strategies
   */
  findAll: async () => {
    return await db.select().from(schema.ragChunkingStrategies);
  },
  
  /**
   * Find chunking strategy by ID
   */
  findById: async (id: number) => {
    const result = await db.select().from(schema.ragChunkingStrategies).where(eq(schema.ragChunkingStrategies.id, id)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Find default chunking strategy
   */
  findDefault: async () => {
    const result = await db.select().from(schema.ragChunkingStrategies).where(eq(schema.ragChunkingStrategies.isDefault, true)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Create chunking strategy
   */
  create: async (data: {
    name: string;
    type: string;
    chunkSize?: number;
    chunkOverlap?: number;
    separator?: string;
    customRules?: any;
    isDefault?: boolean;
  }) => {
    const now = new Date();
    
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(schema.ragChunkingStrategies)
        .set({ isDefault: false })
        .where(eq(schema.ragChunkingStrategies.isDefault, true));
    }
    
    return await db.insert(schema.ragChunkingStrategies).values({
      name: data.name,
      type: data.type,
      chunkSize: data.chunkSize || 1000,
      chunkOverlap: data.chunkOverlap || 200,
      separator: data.separator,
      customRules: data.customRules ? JSON.stringify(data.customRules) : null,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now
    }).returning();
  },
  
  /**
   * Update chunking strategy
   */
  update: async (id: number, data: Partial<{
    name: string;
    chunkSize: number;
    chunkOverlap: number;
    separator: string;
    customRules: any;
    isDefault: boolean;
  }>) => {
    const updateData: any = { updatedAt: new Date() };
    
    // If this is set as default, unset other defaults
    if (data.isDefault === true) {
      await db
        .update(schema.ragChunkingStrategies)
        .set({ isDefault: false })
        .where(eq(schema.ragChunkingStrategies.isDefault, true));
    }
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.chunkSize !== undefined) updateData.chunkSize = data.chunkSize;
    if (data.chunkOverlap !== undefined) updateData.chunkOverlap = data.chunkOverlap;
    if (data.separator !== undefined) updateData.separator = data.separator;
    if (data.customRules !== undefined) updateData.customRules = JSON.stringify(data.customRules);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    
    return await db.update(schema.ragChunkingStrategies)
      .set(updateData)
      .where(eq(schema.ragChunkingStrategies.id, id))
      .returning();
  },
  
  /**
   * Delete chunking strategy
   */
  delete: async (id: number) => {
    return await db.delete(schema.ragChunkingStrategies).where(eq(schema.ragChunkingStrategies.id, id));
  }
};
