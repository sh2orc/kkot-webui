// This file is for server-side only
import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../../config';
import * as schema from '../../schema';

// Get DB instance
const db = getDb();

// RAG Cleansing Config related functions
export const ragCleansingConfigRepository = {
  /**
   * Find all cleansing configs
   */
  findAll: async () => {
    return await db.select().from(schema.ragCleansingConfigs);
  },
  
  /**
   * Find all cleansing configs with LLM model info
   */
  findAllWithModel: async () => {
    return await db
      .select({
        id: schema.ragCleansingConfigs.id,
        name: schema.ragCleansingConfigs.name,
        llmModelId: schema.ragCleansingConfigs.llmModelId,
        cleansingPrompt: schema.ragCleansingConfigs.cleansingPrompt,
        removeHeaders: schema.ragCleansingConfigs.removeHeaders,
        removeFooters: schema.ragCleansingConfigs.removeFooters,
        removePageNumbers: schema.ragCleansingConfigs.removePageNumbers,
        normalizeWhitespace: schema.ragCleansingConfigs.normalizeWhitespace,
        fixEncoding: schema.ragCleansingConfigs.fixEncoding,
        customRules: schema.ragCleansingConfigs.customRules,
        isDefault: schema.ragCleansingConfigs.isDefault,
        createdAt: schema.ragCleansingConfigs.createdAt,
        updatedAt: schema.ragCleansingConfigs.updatedAt,
        llmModelName: schema.llmModels.modelId,
      })
      .from(schema.ragCleansingConfigs)
      .leftJoin(schema.llmModels, eq(schema.ragCleansingConfigs.llmModelId, schema.llmModels.id));
  },
  
  /**
   * Find cleansing config by ID
   */
  findById: async (id: number) => {
    const result = await db.select().from(schema.ragCleansingConfigs).where(eq(schema.ragCleansingConfigs.id, id)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Find default cleansing config
   */
  findDefault: async () => {
    const result = await db.select().from(schema.ragCleansingConfigs).where(eq(schema.ragCleansingConfigs.isDefault, true)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Create cleansing config
   */
  create: async (data: {
    name: string;
    llmModelId?: number | string;
    cleansingPrompt?: string;
    removeHeaders?: boolean;
    removeFooters?: boolean;
    removePageNumbers?: boolean;
    normalizeWhitespace?: boolean;
    fixEncoding?: boolean;
    customRules?: any;
    isDefault?: boolean;
  }) => {
    const now = new Date();
    
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(schema.ragCleansingConfigs)
        .set({ isDefault: false })
        .where(eq(schema.ragCleansingConfigs.isDefault, true));
    }
    
    return await db.insert(schema.ragCleansingConfigs).values({
      name: data.name,
      llmModelId: data.llmModelId || null,
      cleansingPrompt: data.cleansingPrompt,
      removeHeaders: data.removeHeaders ?? true,
      removeFooters: data.removeFooters ?? true,
      removePageNumbers: data.removePageNumbers ?? true,
      normalizeWhitespace: data.normalizeWhitespace ?? true,
      fixEncoding: data.fixEncoding ?? true,
      customRules: data.customRules ? JSON.stringify(data.customRules) : null,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now
    }).returning();
  },
  
  /**
   * Update cleansing config
   */
  update: async (id: number, data: Partial<{
    name: string;
    llmModelId: number | string;
    cleansingPrompt: string;
    removeHeaders: boolean;
    removeFooters: boolean;
    removePageNumbers: boolean;
    normalizeWhitespace: boolean;
    fixEncoding: boolean;
    customRules: any;
    isDefault: boolean;
  }>) => {
    const updateData: any = { updatedAt: new Date() };
    
    // If this is set as default, unset other defaults
    if (data.isDefault === true) {
      await db
        .update(schema.ragCleansingConfigs)
        .set({ isDefault: false })
        .where(eq(schema.ragCleansingConfigs.isDefault, true));
    }
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.llmModelId !== undefined) updateData.llmModelId = data.llmModelId;
    if (data.cleansingPrompt !== undefined) updateData.cleansingPrompt = data.cleansingPrompt;
    if (data.removeHeaders !== undefined) updateData.removeHeaders = data.removeHeaders;
    if (data.removeFooters !== undefined) updateData.removeFooters = data.removeFooters;
    if (data.removePageNumbers !== undefined) updateData.removePageNumbers = data.removePageNumbers;
    if (data.normalizeWhitespace !== undefined) updateData.normalizeWhitespace = data.normalizeWhitespace;
    if (data.fixEncoding !== undefined) updateData.fixEncoding = data.fixEncoding;
    if (data.customRules !== undefined) updateData.customRules = JSON.stringify(data.customRules);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    
    return await db.update(schema.ragCleansingConfigs)
      .set(updateData)
      .where(eq(schema.ragCleansingConfigs.id, id))
      .returning();
  },
  
  /**
   * Delete cleansing config
   */
  delete: async (id: number) => {
    return await db.delete(schema.ragCleansingConfigs).where(eq(schema.ragCleansingConfigs.id, id));
  }
};
