// This file is for server-side only
import 'server-only';

import { eq, and, ne } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { generateId } from './utils';

// Get DB instance
const db = getDb();

// LLM Server related functions
export const llmServerRepository = {
  /**
   * Find all LLM servers
   */
  findAll: async () => {
    return await db.select().from(schema.llmServers);
  },
  
  /**
   * Find LLM server by ID
   */
  findById: async (id: string) => {
    return await db.select().from(schema.llmServers).where(eq(schema.llmServers.id, id)).limit(1);
  },
  
  /**
   * Find LLM servers by provider
   */
  findByProvider: async (provider: string) => {
    return await db.select().from(schema.llmServers).where(eq(schema.llmServers.provider, provider));
  },
  
  /**
   * Find enabled LLM servers
   */
  findEnabled: async () => {
    return await db.select().from(schema.llmServers).where(eq(schema.llmServers.enabled, 1 as any));
  },
  
  /**
   * Find default LLM server
   */
  findDefault: async () => {
    return await db.select().from(schema.llmServers).where(eq(schema.llmServers.isDefault, 1 as any)).limit(1);
  },
  /**
   * Find LLM servers by baseUrl and apiKey
   */
  findByBaseUrlAndApiKey: async (baseUrl: string, apiKey: string) => {
    return await db
      .select()
      .from(schema.llmServers)
      .where(
        and(
          eq(schema.llmServers.baseUrl, baseUrl),
          eq(schema.llmServers.apiKey, apiKey)
        )
      );
  },
  /**
   * Find LLM servers by baseUrl and apiKey excluding a specific id
   */
  findByBaseUrlAndApiKeyExcludingId: async (id: string, baseUrl: string, apiKey: string) => {
    return await db
      .select()
      .from(schema.llmServers)
      .where(
        and(
          eq(schema.llmServers.baseUrl, baseUrl),
          eq(schema.llmServers.apiKey, apiKey),
          ne(schema.llmServers.id, id)
        )
      );
  },
  
  /**
   * Create LLM server
   */
  create: async (serverData: { 
    provider: string; 
    name: string; 
    baseUrl: string; 
    apiKey?: string; 
    models?: string[];
    enabled?: boolean;
    isDefault?: boolean;
    settings?: any;
  }) => {
    const id = generateId();
    const now = new Date();
    
    // If a new server is set as default, unset the existing default
    if (serverData.isDefault) {
      await db.update(schema.llmServers)
        .set({ isDefault: 0 as any })
        .where(eq(schema.llmServers.isDefault, 1 as any));
    }
    
    // Normalize values
    const normalizedBaseUrl = (serverData.baseUrl || '').trim().replace(/\/+$/, '');
    const normalizedApiKey = (serverData.apiKey ?? '').trim();

    return await db.insert(schema.llmServers).values({
      id,
      provider: serverData.provider,
      name: serverData.name,
      baseUrl: normalizedBaseUrl,
      apiKey: normalizedApiKey,
      models: serverData.models ? JSON.stringify(serverData.models) : null,
      enabled: serverData.enabled === false ? 0 : 1 as any,
      isDefault: serverData.isDefault ? 1 : 0 as any,
      settings: serverData.settings ? JSON.stringify(serverData.settings) : null,
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },
  
  /**
   * Update LLM server
   */
  update: async (id: string, serverData: Partial<{ 
    provider: string; 
    name: string; 
    baseUrl: string; 
    apiKey: string; 
    models: string[];
    enabled: boolean;
    isDefault: boolean;
    settings: any;
  }>) => {
    const data: any = { updatedAt: new Date() };
    
    // If a new server is set as default, unset the existing default
    if (serverData.isDefault === true) {
      await db.update(schema.llmServers)
        .set({ isDefault: 0 as any })
        .where(eq(schema.llmServers.isDefault, 1 as any));
    }
    
    if (serverData.provider !== undefined) data.provider = serverData.provider;
    if (serverData.name !== undefined) data.name = serverData.name;
    if (serverData.baseUrl !== undefined) data.baseUrl = serverData.baseUrl.trim().replace(/\/+$/, '');
    if (serverData.apiKey !== undefined) data.apiKey = serverData.apiKey.trim();
    if (serverData.models !== undefined) data.models = JSON.stringify(serverData.models);
    if (typeof serverData.enabled === 'boolean') data.enabled = serverData.enabled ? 1 : 0;
    if (typeof serverData.isDefault === 'boolean') data.isDefault = serverData.isDefault ? 1 : 0;
    if (serverData.settings !== undefined) data.settings = JSON.stringify(serverData.settings);
    
    return await db.update(schema.llmServers)
      .set(data)
      .where(eq(schema.llmServers.id, id))
      .returning();
  },
  
  /**
   * Delete LLM server
   */
  delete: async (id: string) => {
    return await db.delete(schema.llmServers).where(eq(schema.llmServers.id, id));
  }
};

// LLM Model related functions
export const llmModelRepository = {
  /**
   * Find all LLM models
   */
  findAll: async () => {
    return await db.select().from(schema.llmModels);
  },
  
  /**
   * Find all LLM models with server info
   */
  findAllWithServer: async () => {
    return await db
      .select({
        id: schema.llmModels.id,
        serverId: schema.llmModels.serverId,
        modelId: schema.llmModels.modelId,
        provider: schema.llmModels.provider,
        enabled: schema.llmModels.enabled,
        isPublic: schema.llmModels.isPublic,
        capabilities: schema.llmModels.capabilities,
        contextLength: schema.llmModels.contextLength,
        supportsMultimodal: schema.llmModels.supportsMultimodal,
        isEmbeddingModel: schema.llmModels.isEmbeddingModel,
        isRerankingModel: schema.llmModels.isRerankingModel,
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id));
  },

  /**
   * Find all chat models with server info (excluding embedding models)
   */
  findAllChatModelsWithServer: async () => {
    return await db
      .select({
        id: schema.llmModels.id,
        serverId: schema.llmModels.serverId,
        modelId: schema.llmModels.modelId,
        provider: schema.llmModels.provider,
        enabled: schema.llmModels.enabled,
        isPublic: schema.llmModels.isPublic,
        capabilities: schema.llmModels.capabilities,
        contextLength: schema.llmModels.contextLength,
        supportsMultimodal: schema.llmModels.supportsMultimodal,
        isEmbeddingModel: schema.llmModels.isEmbeddingModel,
        isRerankingModel: schema.llmModels.isRerankingModel,
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id))
      .where(eq(schema.llmModels.isEmbeddingModel, 0 as any)); // Exclude embedding models
  },
  
  /**
   * Find LLM models by server ID
   */
  findByServerId: async (serverId: string) => {
    return await db.select().from(schema.llmModels).where(eq(schema.llmModels.serverId, serverId));
  },
  
  /**
   * Find LLM models by server ID with server info
   */
  findByServerIdWithServer: async (serverId: string) => {
    return await db
      .select({
        id: schema.llmModels.id,
        serverId: schema.llmModels.serverId,
        modelId: schema.llmModels.modelId,
        provider: schema.llmModels.provider,
        enabled: schema.llmModels.enabled,
        isPublic: schema.llmModels.isPublic,
        capabilities: schema.llmModels.capabilities,
        contextLength: schema.llmModels.contextLength,
        supportsMultimodal: schema.llmModels.supportsMultimodal,
        isEmbeddingModel: schema.llmModels.isEmbeddingModel,
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id))
      .where(eq(schema.llmModels.serverId, serverId));
  },

  /**
   * Find chat models by server ID with server info (excluding embedding models)
   */
  findChatModelsByServerIdWithServer: async (serverId: string) => {
    return await db
      .select({
        id: schema.llmModels.id,
        serverId: schema.llmModels.serverId,
        modelId: schema.llmModels.modelId,
        provider: schema.llmModels.provider,
        enabled: schema.llmModels.enabled,
        isPublic: schema.llmModels.isPublic,
        capabilities: schema.llmModels.capabilities,
        contextLength: schema.llmModels.contextLength,
        supportsMultimodal: schema.llmModels.supportsMultimodal,
        isEmbeddingModel: schema.llmModels.isEmbeddingModel,
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id))
      .where(and(
        eq(schema.llmModels.serverId, serverId),
        eq(schema.llmModels.isEmbeddingModel, 0 as any) // Exclude embedding models
      ));
  },
  
  /**
   * Find LLM models by provider
   */
  findByProvider: async (provider: string) => {
    return await db.select().from(schema.llmModels).where(eq(schema.llmModels.provider, provider));
  },
  
  /**
   * Find LLM model by ID
   */
  findById: async (id: string) => {
    return await db.select().from(schema.llmModels).where(eq(schema.llmModels.id, id)).limit(1);
  },

  /**
   * Find enabled models
   */
  findEnabled: async () => {
    return await db.select().from(schema.llmModels).where(eq(schema.llmModels.enabled, 1 as any));
  },
  
  /**
   * Find public models (excluding embedding models)
   */
  findPublic: async () => {
    return await db
      .select({
        id: schema.llmModels.id,
        serverId: schema.llmModels.serverId,
        modelId: schema.llmModels.modelId,
        provider: schema.llmModels.provider,
        enabled: schema.llmModels.enabled,
        isPublic: schema.llmModels.isPublic,
        capabilities: schema.llmModels.capabilities,
        contextLength: schema.llmModels.contextLength,
        supportsMultimodal: schema.llmModels.supportsMultimodal,
        isEmbeddingModel: schema.llmModels.isEmbeddingModel,
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id))
      .where(and(
        eq(schema.llmModels.enabled, 1 as any),
        eq(schema.llmModels.isPublic, 1 as any),
        eq(schema.llmModels.isEmbeddingModel, 0 as any) // Exclude embedding models
      ));
  },

  /**
   * Find public embedding models only
   */
  findPublicEmbeddingModels: async () => {
    return await db
      .select({
        id: schema.llmModels.id,
        serverId: schema.llmModels.serverId,
        modelId: schema.llmModels.modelId,
        provider: schema.llmModels.provider,
        enabled: schema.llmModels.enabled,
        isPublic: schema.llmModels.isPublic,
        capabilities: schema.llmModels.capabilities,
        contextLength: schema.llmModels.contextLength,
        supportsMultimodal: schema.llmModels.supportsMultimodal,
        isEmbeddingModel: schema.llmModels.isEmbeddingModel,
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id))
      .where(and(
        eq(schema.llmModels.enabled, 1 as any),
        eq(schema.llmModels.isPublic, 1 as any),
        eq(schema.llmModels.isEmbeddingModel, 1 as any) // Only embedding models
      ));
  },
  
  /**
   * Find model by server ID and model ID
   */
  findByServerAndModelId: async (serverId: string, modelId: string) => {
    return await db.select().from(schema.llmModels)
      .where(and(
        eq(schema.llmModels.serverId, serverId),
        eq(schema.llmModels.modelId, modelId)
      ))
      .limit(1);
  },
  
  /**
   * Create or update LLM model
   */
  upsert: async (modelData: {
    serverId: string;
    modelId: string;
    provider: string;
    enabled?: boolean;
    isPublic?: boolean;
    capabilities?: any;
    contextLength?: number;
    supportsMultimodal?: boolean;
    isEmbeddingModel?: boolean;
  }) => {
    const existing = await llmModelRepository.findByServerAndModelId(modelData.serverId, modelData.modelId);
    const now = new Date();
    
    if (existing && existing.length > 0) {
      // Update existing model - only update the update date (maintain enabled status)
      const data: any = { updatedAt: now };
      
      // Only update if explicitly provided
      if (typeof modelData.enabled === 'boolean') data.enabled = modelData.enabled ? 1 : 0;
      if (typeof modelData.isPublic === 'boolean') data.isPublic = modelData.isPublic ? 1 : 0;
      if (modelData.capabilities !== undefined) data.capabilities = JSON.stringify(modelData.capabilities);
      if (modelData.contextLength !== undefined) data.contextLength = modelData.contextLength;
      if (typeof modelData.supportsMultimodal === 'boolean') data.supportsMultimodal = modelData.supportsMultimodal ? 1 : 0;
      if (typeof modelData.isEmbeddingModel === 'boolean') data.isEmbeddingModel = modelData.isEmbeddingModel ? 1 : 0;
      
      return await db.update(schema.llmModels)
        .set(data)
        .where(eq(schema.llmModels.id, existing[0].id))
        .returning();
    } else {
      // Create new model - default is disabled
      const id = generateId();
      
      return await db.insert(schema.llmModels).values({
        id,
        serverId: modelData.serverId,
        modelId: modelData.modelId,
        provider: modelData.provider,
        enabled: 0 as any,  // New models are disabled by default
        isPublic: 0 as any,  // New models are private by default
        capabilities: modelData.capabilities ? JSON.stringify(modelData.capabilities) : null,
        contextLength: modelData.contextLength,
        supportsMultimodal: modelData.supportsMultimodal ? 1 : 0 as any,
        isEmbeddingModel: modelData.isEmbeddingModel ? 1 : 0 as any,
        createdAt: now as any,
        updatedAt: now as any
      }).returning();
    }
  },
  
  /**
   * Update LLM model
   */
  update: async (id: string, modelData: Partial<{
    enabled: boolean;
    isPublic: boolean;
    capabilities: any;
    contextLength: number;
    supportsMultimodal: boolean;
    isEmbeddingModel: boolean;
    isRerankingModel: boolean;
  }>) => {
    const data: any = { updatedAt: new Date() };
    
    if (typeof modelData.enabled === 'boolean') data.enabled = modelData.enabled ? 1 : 0;
    if (typeof modelData.isPublic === 'boolean') data.isPublic = modelData.isPublic ? 1 : 0;
    if (modelData.capabilities !== undefined) data.capabilities = JSON.stringify(modelData.capabilities);
    if (modelData.contextLength !== undefined) data.contextLength = modelData.contextLength;
    if (typeof modelData.supportsMultimodal === 'boolean') data.supportsMultimodal = modelData.supportsMultimodal ? 1 : 0;
    if (typeof modelData.isEmbeddingModel === 'boolean') data.isEmbeddingModel = modelData.isEmbeddingModel ? 1 : 0;
    if (typeof modelData.isRerankingModel === 'boolean') data.isRerankingModel = modelData.isRerankingModel ? 1 : 0;
    
    return await db.update(schema.llmModels)
      .set(data)
      .where(eq(schema.llmModels.id, id))
      .returning();
  },
  
  /**
   * Delete LLM model
   */
  delete: async (id: string) => {
    return await db.delete(schema.llmModels).where(eq(schema.llmModels.id, id));
  }
};
