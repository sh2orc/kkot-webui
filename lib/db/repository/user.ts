// This file is for server-side only
import 'server-only';

import { eq } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { generateId } from './utils';

// Get DB instance
const db = getDb();

// User related functions
export const userRepository = {
  /**
   * Get all users
   */
  findAll: async () => {
    return await db.select().from(schema.users);
  },
  
  /**
   * Find user by ID
   */
  findById: async (id: string | number) => {
    return await db.select().from(schema.users).where(eq(schema.users.id, id as any)).limit(1);
  },
  
  /**
   * Find user by email
   */
  findByEmail: async (email: string) => {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Create user
   */
  create: async (userData: { username: string; email: string; password: string; role?: string }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.users).values({
      id: id as any,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'user',
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },
  
  /**
   * Update user
   */
  update: async (id: string | number, userData: Partial<{ username: string; email: string; password: string; role: string }>) => {
    return await db.update(schema.users)
      .set({ ...userData, updatedAt: new Date() as any })
      .where(eq(schema.users.id, id as any))
      .returning();
  },
  
  /**
   * Delete user
   */
  delete: async (id: string | number) => {
    return await db.delete(schema.users).where(eq(schema.users.id, id as any));
  }
};
