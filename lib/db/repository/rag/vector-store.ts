// This file is for server-side only
import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../../config';
import * as schema from '../../schema';

// Get DB instance
const db = getDb();

// RAG Vector Store related functions
export const ragVectorStoreRepository = {
  /**
   * Find all vector stores
   */
  findAll: async () => {
    return await db.select().from(schema.ragVectorStores);
  },
  
  /**
   * Find vector store by ID
   */
  findById: async (id: number) => {
    const result = await db.select().from(schema.ragVectorStores).where(eq(schema.ragVectorStores.id, id)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Find enabled vector stores
   */
  findEnabled: async () => {
    return await db.select().from(schema.ragVectorStores).where(eq(schema.ragVectorStores.enabled, true));
  },
  
  /**
   * Find default vector store
   */
  findDefault: async () => {
    const result = await db.select().from(schema.ragVectorStores).where(eq(schema.ragVectorStores.isDefault, true)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Create vector store
   */
  create: async (data: {
    name: string;
    type: string;
    connectionString?: string;
    apiKey?: string;
    settings?: string;
    enabled?: boolean;
    isDefault?: boolean;
  }) => {
    const now = new Date();
    
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(schema.ragVectorStores)
        .set({ isDefault: false })
        .where(eq(schema.ragVectorStores.isDefault, true));
    }
    
    return await db.insert(schema.ragVectorStores).values({
      name: data.name,
      type: data.type,
      connectionString: data.connectionString,
      apiKey: data.apiKey,
      settings: data.settings,
      enabled: data.enabled ?? true,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now
    }).returning();
  },
  
  /**
   * Update vector store
   */
  update: async (id: number, data: Partial<{
    name: string;
    type: string;
    connectionString: string;
    apiKey: string;
    settings: string;
    enabled: boolean;
    isDefault: boolean;
  }>) => {
    const updateData: any = { updatedAt: new Date() };
    
    // If this is set as default, unset other defaults
    if (data.isDefault === true) {
      await db
        .update(schema.ragVectorStores)
        .set({ isDefault: false })
        .where(eq(schema.ragVectorStores.isDefault, true));
    }
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.connectionString !== undefined) updateData.connectionString = data.connectionString;
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    
    return await db.update(schema.ragVectorStores)
      .set(updateData)
      .where(eq(schema.ragVectorStores.id, id))
      .returning();
  },
  
  /**
   * Delete vector store
   */
  delete: async (id: number) => {
    return await db.delete(schema.ragVectorStores).where(eq(schema.ragVectorStores.id, id));
  }
};
