// This file is for server-side only
import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { generateId } from './utils';

// Get DB instance
const db = getDb();

// Admin settings related functions (renamed from system settings)
export const adminSettingsRepository = {
  /**
   * Find all admin settings
   */
  findAll: async () => {
    return await db.select().from(schema.systemSettings);
  },
  
  /**
   * Find admin setting by key
   */
  findByKey: async (key: string) => {
    return await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, key)).limit(1);
  },
  
  /**
   * Upsert admin setting (create if not exists, update if exists)
   */
  upsert: async (key: string, value: string) => {
    const existing = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, key)).limit(1);
    const now = new Date();
    
    if (existing && existing.length > 0) {
      return await db.update(schema.systemSettings)
        .set({ value, updatedAt: now as any })
        .where(eq(schema.systemSettings.key, key))
        .returning();
    } else {
      const id = generateId();
      
      return await db.insert(schema.systemSettings).values({
        id: id as any,
        key,
        value,
        updatedAt: now as any
      }).returning();
    }
  }
};
