// This file is for server-side only
import 'server-only';

import { eq, and, ne } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { generateId } from './utils';

// Get DB instance
const db = getDb();

// API connection related functions
export const apiConnectionRepository = {
  /**
   * Find all API connections
   */
  findAll: async () => {
    return await db.select().from(schema.apiConnections);
  },
  
  /**
   * Find API connection by ID
   */
  findById: async (id: string | number) => {
    return await db.select().from(schema.apiConnections).where(eq(schema.apiConnections.id, id as any)).limit(1);
  },
  
  /**
   * Find API connection by type
   */
  findByType: async (type: string) => {
    return await db.select().from(schema.apiConnections).where(eq(schema.apiConnections.type, type));
  },
  
  /**
   * Create API connection
   */
  create: async (connectionData: { type: string; name: string; url: string; apiKey?: string; enabled?: boolean }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.apiConnections).values({
      id: id as any,
      type: connectionData.type,
      name: connectionData.name,
      url: connectionData.url,
      apiKey: connectionData.apiKey,
      enabled: connectionData.enabled === false ? 0 : 1 as any,
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },
  
  /**
   * Update API connection
   */
  update: async (id: string | number, connectionData: Partial<{ type: string; name: string; url: string; apiKey: string; enabled: boolean }>) => {
    const data: any = { updatedAt: new Date() };
    
    if (typeof connectionData.enabled === 'boolean') {
      data.enabled = connectionData.enabled ? 1 : 0;
    }
    
    return await db.update(schema.apiConnections)
      .set(data)
      .where(eq(schema.apiConnections.id, id as any))
      .returning();
  }
};

// API management related functions
export const apiManagementRepository = {
  /**
   * Get API management settings
   */
  findById: async (id: string = 'default') => {
    const result = await db.select().from(schema.apiManagement).where(eq(schema.apiManagement.id, id as any)).limit(1);
    return result[0] || null;
  },

  /**
   * Create or update API management settings
   */
  upsert: async (data: {
    apiEnabled: boolean;
    openaiCompatible: boolean;
    corsEnabled: boolean;
    corsOrigins: string;
    rateLimitEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
    requireAuth: boolean;
    apiKeyEnabled: boolean;
    apiKeyEndpointLimited: boolean;
  }) => {
    const id = 'default';
    const now = new Date();
    
    // First try to update existing record
    const existing = await db.select().from(schema.apiManagement).where(eq(schema.apiManagement.id, id as any)).limit(1);
    
    if (existing.length > 0) {
      return await db.update(schema.apiManagement)
        .set({
          apiEnabled: data.apiEnabled as any,
          openaiCompatible: data.openaiCompatible as any,
          corsEnabled: data.corsEnabled as any,
          corsOrigins: data.corsOrigins,
          rateLimitEnabled: data.rateLimitEnabled as any,
          rateLimitRequests: data.rateLimitRequests,
          rateLimitWindow: data.rateLimitWindow,
          requireAuth: data.requireAuth as any,
          apiKeyEnabled: data.apiKeyEnabled as any,
          apiKeyEndpointLimited: data.apiKeyEndpointLimited as any,
          updatedAt: now as any
        })
        .where(eq(schema.apiManagement.id, id as any))
        .returning();
    } else {
      return await db.insert(schema.apiManagement).values({
        id: id as any,
        apiEnabled: data.apiEnabled as any,
        openaiCompatible: data.openaiCompatible as any,
        corsEnabled: data.corsEnabled as any,
        corsOrigins: data.corsOrigins,
        rateLimitEnabled: data.rateLimitEnabled as any,
        rateLimitRequests: data.rateLimitRequests,
        rateLimitWindow: data.rateLimitWindow,
        requireAuth: data.requireAuth as any,
        apiKeyEnabled: data.apiKeyEnabled as any,
        apiKeyEndpointLimited: data.apiKeyEndpointLimited as any,
        createdAt: now as any,
        updatedAt: now as any
      }).returning();
    }
  },

  /**
   * Get default API management settings
   */
  getDefaultSettings: () => {
    return {
      apiEnabled: false,
      openaiCompatible: true,
      corsEnabled: true,
      corsOrigins: '*',
      rateLimitEnabled: true,
      rateLimitRequests: 1000,
      rateLimitWindow: 3600,
      requireAuth: true,
      apiKeyEnabled: false,
      apiKeyEndpointLimited: false,
    };
  }
};

// API Keys related functions
export const apiKeysRepository = {
  /**
   * Get all API keys
   */
  findAll: async () => {
    return await db.select().from(schema.apiKeys);
  },

  /**
   * Find API key by ID
   */
  findById: async (id: string) => {
    const result = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.id, id as any)).limit(1);
    return result[0] || null;
  },

  /**
   * Find API key by key hash
   */
  findByKeyHash: async (keyHash: string) => {
    const result = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.keyHash, keyHash as any)).limit(1);
    return result[0] || null;
  },

  /**
   * Create API key
   */
  create: async (data: {
    name: string;
    keyHash: string;
    keyPrefix: string;
    userId?: string;
    permissions: string[];
    rateLimitTier: string;
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
    allowedIps?: string[];
    expiresAt?: Date;
  }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.apiKeys).values({
      id: id as any,
      name: data.name,
      keyHash: data.keyHash,
      keyPrefix: data.keyPrefix,
      userId: data.userId as any,
      permissions: JSON.stringify(data.permissions),
      rateLimitTier: data.rateLimitTier,
      maxRequestsPerHour: data.maxRequestsPerHour,
      maxRequestsPerDay: data.maxRequestsPerDay,
      allowedIps: data.allowedIps ? JSON.stringify(data.allowedIps) : null,
      expiresAt: data.expiresAt as any,
      isActive: true as any,
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },

  /**
   * Update API key
   */
  update: async (id: string, data: {
    name?: string;
    permissions?: string[];
    rateLimitTier?: string;
    maxRequestsPerHour?: number;
    maxRequestsPerDay?: number;
    allowedIps?: string[];
    expiresAt?: Date;
    isActive?: boolean;
    lastUsedAt?: Date;
  }) => {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.permissions !== undefined) updateData.permissions = JSON.stringify(data.permissions);
    if (data.rateLimitTier !== undefined) updateData.rateLimitTier = data.rateLimitTier;
    if (data.maxRequestsPerHour !== undefined) updateData.maxRequestsPerHour = data.maxRequestsPerHour;
    if (data.maxRequestsPerDay !== undefined) updateData.maxRequestsPerDay = data.maxRequestsPerDay;
    if (data.allowedIps !== undefined) updateData.allowedIps = data.allowedIps ? JSON.stringify(data.allowedIps) : null;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.lastUsedAt !== undefined) updateData.lastUsedAt = data.lastUsedAt;
    
    return await db.update(schema.apiKeys)
      .set(updateData)
      .where(eq(schema.apiKeys.id, id as any))
      .returning();
  },

  /**
   * Delete API key
   */
  delete: async (id: string) => {
    return await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, id as any));
  },

  /**
   * Get active API keys
   */
  findActive: async () => {
    return await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.isActive, true as any));
  },

  /**
   * Get expired API keys
   */
  findExpired: async () => {
    const now = new Date();
    return await db.select().from(schema.apiKeys).where(
      and(
        eq(schema.apiKeys.isActive, true as any),
        ne(schema.apiKeys.expiresAt, null as any)
      )
    );
  }
};

// API Usage related functions
export const apiUsageRepository = {
  /**
   * Record API usage
   */
  create: async (data: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    tokensUsed?: number;
    responseTimeMs?: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.apiUsage).values({
      id: id as any,
      apiKeyId: data.apiKeyId as any,
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      tokensUsed: data.tokensUsed || 0,
      responseTimeMs: data.responseTimeMs || 0,
      errorMessage: data.errorMessage,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: now as any
    }).returning();
  },

  /**
   * Get usage statistics for an API key
   */
  getUsageStats: async (apiKeyId: string, fromDate: Date, toDate: Date) => {
    return await db.select().from(schema.apiUsage)
      .where(
        and(
          eq(schema.apiUsage.apiKeyId, apiKeyId as any),
          // Add date range filter logic here
        )
      );
  },

  /**
   * Get all usage records
   */
  findAll: async (limit: number = 100) => {
    return await db.select().from(schema.apiUsage).limit(limit);
  },

  /**
   * Get usage by API key
   */
  findByApiKey: async (apiKeyId: string, limit: number = 100) => {
    return await db.select().from(schema.apiUsage)
      .where(eq(schema.apiUsage.apiKeyId, apiKeyId as any))
      .limit(limit);
  }
};
