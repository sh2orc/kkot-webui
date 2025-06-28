// This file is for server-side only
import 'server-only';

import { eq, and } from 'drizzle-orm';
import { getDb } from './config';
import * as schema from './schema';

// Get DB instance
const db = getDb();

// Add generateId function
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  return `${timestamp}-${randomPart}`;
}

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

// Chat session related functions
export const chatSessionRepository = {
  /**
   * Find all chat sessions for a user
   */
  findByUserId: async (userId: string | number) => {
    return await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.userId, userId as any));
  },
  
  /**
   * Find chat session by ID
   */
  findById: async (id: string | number) => {
    return await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, id as any)).limit(1);
  },
  
  /**
   * Create chat session
   */
  create: async (sessionData: { userId: string | number; title: string }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.chatSessions).values({
      id: id as any,
      userId: sessionData.userId as any,
      title: sessionData.title,
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },
  
  /**
   * Update chat session
   */
  update: async (id: string | number, sessionData: { title?: string }) => {
    return await db.update(schema.chatSessions)
      .set({ ...sessionData, updatedAt: new Date() as any })
      .where(eq(schema.chatSessions.id, id as any))
      .returning();
  },
  
  /**
   * Delete chat session
   */
  delete: async (id: string | number) => {
    return await db.delete(schema.chatSessions).where(eq(schema.chatSessions.id, id as any));
  }
};

// Chat message related functions
export const chatMessageRepository = {
  /**
   * Find all messages for a session
   */
  findBySessionId: async (sessionId: string | number) => {
    return await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.sessionId, sessionId as any));
  },
  
  /**
   * Create message
   */
  create: async (messageData: { sessionId: string | number; role: 'user' | 'assistant'; content: string }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.chatMessages).values({
      id: id as any,
      sessionId: messageData.sessionId as any,
      role: messageData.role,
      content: messageData.content,
      createdAt: now as any
    }).returning();
  }
};

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
    
    return await db.insert(schema.llmServers).values({
      id,
      provider: serverData.provider,
      name: serverData.name,
      baseUrl: serverData.baseUrl,
      apiKey: serverData.apiKey,
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
    if (serverData.baseUrl !== undefined) data.baseUrl = serverData.baseUrl;
    if (serverData.apiKey !== undefined) data.apiKey = serverData.apiKey;
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
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id));
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
   * Find LLM models by provider
   */
  findByProvider: async (provider: string) => {
    return await db.select().from(schema.llmModels).where(eq(schema.llmModels.provider, provider));
  },
  
  /**
   * Find enabled models
   */
  findEnabled: async () => {
    return await db.select().from(schema.llmModels).where(eq(schema.llmModels.enabled, 1 as any));
  },
  
  /**
   * Find public models
   */
  findPublic: async () => {
    return await db.select().from(schema.llmModels)
      .where(and(
        eq(schema.llmModels.enabled, 1 as any),
        eq(schema.llmModels.isPublic, 1 as any)
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
  }>) => {
    const data: any = { updatedAt: new Date() };
    
    if (typeof modelData.enabled === 'boolean') data.enabled = modelData.enabled ? 1 : 0;
    if (typeof modelData.isPublic === 'boolean') data.isPublic = modelData.isPublic ? 1 : 0;
    if (modelData.capabilities !== undefined) data.capabilities = JSON.stringify(modelData.capabilities);
    if (modelData.contextLength !== undefined) data.contextLength = modelData.contextLength;
    
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