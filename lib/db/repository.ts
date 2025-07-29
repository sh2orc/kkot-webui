// This file is for server-side only
import 'server-only';

import { eq, and, ne, inArray } from 'drizzle-orm';
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
  findByUserEmail: async (userEmail: string) => {
    return await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.userEmail, userEmail));
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
  create: async (sessionData: { userEmail: string; title: string }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.chatSessions).values({
      id: id as any,
      userEmail: sessionData.userEmail,
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
  },

  /**
   * Delete message by ID
   */
  delete: async (id: string | number) => {
    return await db.delete(schema.chatMessages).where(eq(schema.chatMessages.id, id as any));
  },

  /**
   * Delete messages from a specific message onwards (for chat regeneration)
   * @param sessionId - Chat session ID
   * @param fromMessageId - Message ID to start deleting from (inclusive)
   */
  deleteFromMessageOnwards: async (sessionId: string | number, fromMessageId: string | number) => {
    console.log('=== deleteFromMessageOnwards called ===');
    console.log('sessionId:', sessionId);
    console.log('fromMessageId:', fromMessageId);
    
    // First, get all messages for the session ordered by creation time
    const allMessages = await db.select().from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId as any))
      .orderBy(schema.chatMessages.createdAt);
    
    console.log('Total messages in session:', allMessages.length);
    
    // Find the index of the target message
    const fromMessageIndex = allMessages.findIndex((msg: any) => msg.id === fromMessageId);
    
    if (fromMessageIndex === -1) {
      console.log('Target message not found, no deletion needed');
      throw new Error('Message not found');
    }
    
    console.log('Found target message at index:', fromMessageIndex);
    
    // Get all message IDs from the target message onwards
    const messagesToDelete = allMessages.slice(fromMessageIndex);
    const messageIds = messagesToDelete.map((msg: any) => msg.id);
    
    console.log('Messages to delete:', messageIds);
    
    if (messageIds.length === 0) {
      console.log('No messages to delete');
      return [];
    }
    
    try {
      // Delete all messages from the target message onwards
      const deleteResult = await db.delete(schema.chatMessages)
        .where(
          messageIds.length === 1 
            ? eq(schema.chatMessages.id, messageIds[0] as any)
            : inArray(schema.chatMessages.id, messageIds as any[])
        )
        .returning();
      
      console.log('Delete operation completed. Deleted count:', deleteResult.length);
      
      // Verify deletion by checking remaining messages
      const remainingMessages = await db.select().from(schema.chatMessages)
        .where(eq(schema.chatMessages.sessionId, sessionId as any))
        .orderBy(schema.chatMessages.createdAt);
      
      console.log('Remaining messages after deletion:', remainingMessages.length);
      
      return deleteResult;
    } catch (error) {
      console.error('Error during message deletion:', error);
      throw error;
    }
  },

  /**
   * Update message rating
   */
  updateRating: async (messageId: string | number, rating: number) => {
    return await db.update(schema.chatMessages)
      .set({ rating: rating })
      .where(eq(schema.chatMessages.id, messageId as any))
      .returning();
  },

  /**
   * Update message content
   */
  updateContent: async (messageId: string | number, content: string) => {
    return await db.update(schema.chatMessages)
      .set({ content: content })
      .where(eq(schema.chatMessages.id, messageId as any))
      .returning();
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
        supportsMultimodal: schema.llmModels.supportsMultimodal,
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
        supportsMultimodal: schema.llmModels.supportsMultimodal,
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
   * Find public models
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
        createdAt: schema.llmModels.createdAt,
        updatedAt: schema.llmModels.updatedAt,
        serverName: schema.llmServers.name,
        serverBaseUrl: schema.llmServers.baseUrl
      })
      .from(schema.llmModels)
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id))
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
    supportsMultimodal?: boolean;
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
  }>) => {
    const data: any = { updatedAt: new Date() };
    
    if (typeof modelData.enabled === 'boolean') data.enabled = modelData.enabled ? 1 : 0;
    if (typeof modelData.isPublic === 'boolean') data.isPublic = modelData.isPublic ? 1 : 0;
    if (modelData.capabilities !== undefined) data.capabilities = JSON.stringify(modelData.capabilities);
    if (modelData.contextLength !== undefined) data.contextLength = modelData.contextLength;
    if (typeof modelData.supportsMultimodal === 'boolean') data.supportsMultimodal = modelData.supportsMultimodal ? 1 : 0;
    
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

// Agent manage related functions
export const agentManageRepository = {
  /**
   * Find all agents
   */
  findAll: async () => {
    return await db.select().from(schema.agentManage);
  },
  
  /**
   * Find all agents with model and server info
   */
  findAllWithModelAndServer: async () => {
    return await db
      .select({
        id: schema.agentManage.id,
        agentId: schema.agentManage.agentId,
        modelId: schema.agentManage.modelId,
        name: schema.agentManage.name,
        systemPrompt: schema.agentManage.systemPrompt,
        temperature: schema.agentManage.temperature,
        topK: schema.agentManage.topK,
        topP: schema.agentManage.topP,
        maxTokens: schema.agentManage.maxTokens,
        presencePenalty: schema.agentManage.presencePenalty,
        frequencyPenalty: schema.agentManage.frequencyPenalty,
        imageData: schema.agentManage.imageData,
        description: schema.agentManage.description,
        enabled: schema.agentManage.enabled,
        parameterEnabled: schema.agentManage.parameterEnabled,
        supportsMultimodal: schema.agentManage.supportsMultimodal,
        supportsDeepResearch: schema.agentManage.supportsDeepResearch,
        supportsWebSearch: schema.agentManage.supportsWebSearch,
        createdAt: schema.agentManage.createdAt,
        updatedAt: schema.agentManage.updatedAt,
        modelName: schema.llmModels.modelId,
        modelProvider: schema.llmModels.provider,
        modelSupportsMultimodal: schema.llmModels.supportsMultimodal,
        serverName: schema.llmServers.name,
        serverProvider: schema.llmServers.provider
      })
      .from(schema.agentManage)
      .leftJoin(schema.llmModels, eq(schema.agentManage.modelId, schema.llmModels.id))
      .leftJoin(schema.llmServers, eq(schema.llmModels.serverId, schema.llmServers.id));
  },
  
  /**
   * Find agent by agentId
   */
  findByAgentId: async (agentId: string) => {
    return await db.select().from(schema.agentManage).where(eq(schema.agentManage.agentId, agentId)).limit(1);
  },

  /**
   * Check if agentId is available
   */
  isAgentIdAvailable: async (agentId: string, excludeId?: string) => {
    let query = db.select().from(schema.agentManage).where(eq(schema.agentManage.agentId, agentId));
    
    if (excludeId) {
      query = query.where(and(
        eq(schema.agentManage.agentId, agentId),
        ne(schema.agentManage.id, excludeId)
      ));
    }
    
    const result = await query.limit(1);
    return result.length === 0;
  },

  /**
   * Find agent by ID
   */
  findById: async (id: string) => {
    const result = await db.select().from(schema.agentManage).where(eq(schema.agentManage.id, id));
    
    // Add image data debugging information
    if (result.length > 0 && result[0].imageData) {
      const imageData = result[0].imageData;
      console.log(`Agent ${id} image data type:`, typeof imageData);
      console.log(`Agent ${id} image data length:`, 
        imageData instanceof Uint8Array ? imageData.length : 
        typeof imageData === 'string' ? imageData.length : 
        'unknown'
      );
      console.log(`Agent ${id} image data sample:`, 
        imageData instanceof Uint8Array ? `Uint8Array[${imageData.slice(0, 10).join(',')}...]` :
        typeof imageData === 'string' ? imageData.substring(0, 50) + '...' :
        'unknown format'
      );
    } else {
      console.log(`Agent ${id} has no image data`);
    }
    
    return result;
  },
  
  /**
   * Find agents by model ID
   */
  findByModelId: async (modelId: string) => {
    return await db.select().from(schema.agentManage).where(eq(schema.agentManage.modelId, modelId));
  },
  
  /**
   * Find enabled agents
   */
  findEnabled: async () => {
    return await db.select().from(schema.agentManage).where(eq(schema.agentManage.enabled, 1 as any));
  },
  
  /**
   * Create agent
   */
  create: async (agentData: {
    agentId: string;
    modelId: string;
    name: string;
    systemPrompt?: string;
    temperature?: string;
    topK?: number;
    topP?: string;
    maxTokens?: number;
    presencePenalty?: string;
    frequencyPenalty?: string;
    imageData?: string;
    description?: string;
    enabled?: boolean;
    parameterEnabled?: boolean;
    supportsDeepResearch?: boolean;
    supportsWebSearch?: boolean;
  }) => {
    const id = generateId();
    const now = new Date();
    
    console.log("=== Agent DB save start ===")
    console.log("Agent ID:", id)
    console.log("Agent name:", agentData.name)
    console.log("Image data exists:", !!agentData.imageData)
    
    if (agentData.imageData) {
      console.log("Image data type:", typeof agentData.imageData)
      console.log("Image data length:", agentData.imageData.length)
      console.log("Image data start part:", agentData.imageData.substring(0, 50) + "...")
      
      // base64 validity verification
      try {
        const buffer = Buffer.from(agentData.imageData, 'base64');
        console.log("base64 decoding success, actual byte size:", buffer.length)
      } catch (error) {
        console.error("base64 decoding failed:", error)
      }
    }
    
    const result = await db.insert(schema.agentManage).values({
      id,
      agentId: agentData.agentId,
      modelId: agentData.modelId,
      name: agentData.name,
      systemPrompt: agentData.systemPrompt,
      temperature: agentData.temperature || '0.7',
      topK: agentData.topK || 50,
      topP: agentData.topP || '0.95',
      maxTokens: agentData.maxTokens || 2048,
      presencePenalty: agentData.presencePenalty || '0.0',
      frequencyPenalty: agentData.frequencyPenalty || '0.0',
      imageData: agentData.imageData,
      description: agentData.description,
      enabled: agentData.enabled === false ? 0 : 1 as any,
      parameterEnabled: agentData.parameterEnabled === false ? 0 : 1 as any,
      supportsDeepResearch: agentData.supportsDeepResearch === false ? 0 : 1 as any,
      supportsWebSearch: agentData.supportsWebSearch === false ? 0 : 1 as any,
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
    
    console.log("Agent DB save completed")
    console.log("=== Agent DB save end ===")
    
    return result;
  },
  
  /**
   * Update agent
   */
  update: async (id: string, agentData: Partial<{
    agentId: string;
    modelId: string;
    name: string;
    systemPrompt: string;
    temperature: string;
    topK: number;
    topP: string;
    maxTokens: number;
    presencePenalty: string;
    frequencyPenalty: string;
    imageData: string;
    description: string;
    enabled: boolean;
    parameterEnabled: boolean;
    supportsDeepResearch: boolean;
    supportsWebSearch: boolean;
  }>) => {
    const data: any = { updatedAt: new Date() };
    
    console.log("=== Agent DB update start ===")
    console.log("Agent ID:", id)
    console.log("Fields to update:", Object.keys(agentData))
    
    if (agentData.imageData !== undefined) {
      console.log("Updating image data")
      if (agentData.imageData) {
        console.log("Image data type:", typeof agentData.imageData)
        console.log("Image data length:", agentData.imageData.length)
        console.log("Image data start part:", agentData.imageData.substring(0, 50) + "...")
        
        // base64 validity verification
        try {
          const buffer = Buffer.from(agentData.imageData, 'base64');
          console.log("base64 decoding success, actual byte size:", buffer.length)
        } catch (error) {
          console.error("base64 decoding failed:", error)
        }
      } else {
        console.log("Removing image data")
      }
    }
    
    if (agentData.agentId !== undefined) data.agentId = agentData.agentId;
    if (agentData.modelId !== undefined) data.modelId = agentData.modelId;
    if (agentData.name !== undefined) data.name = agentData.name;
    if (agentData.systemPrompt !== undefined) data.systemPrompt = agentData.systemPrompt;
    if (agentData.temperature !== undefined) data.temperature = agentData.temperature;
    if (agentData.topK !== undefined) data.topK = agentData.topK;
    if (agentData.topP !== undefined) data.topP = agentData.topP;
    if (agentData.maxTokens !== undefined) data.maxTokens = agentData.maxTokens;
    if (agentData.presencePenalty !== undefined) data.presencePenalty = agentData.presencePenalty;
    if (agentData.frequencyPenalty !== undefined) data.frequencyPenalty = agentData.frequencyPenalty;
    if (agentData.imageData !== undefined) data.imageData = agentData.imageData;
    if (agentData.description !== undefined) data.description = agentData.description;
    if (typeof agentData.enabled === 'boolean') data.enabled = agentData.enabled ? 1 : 0;
    if (typeof agentData.parameterEnabled === 'boolean') data.parameterEnabled = agentData.parameterEnabled ? 1 : 0;
    if (typeof agentData.supportsDeepResearch === 'boolean') data.supportsDeepResearch = agentData.supportsDeepResearch ? 1 : 0;
    if (typeof agentData.supportsWebSearch === 'boolean') data.supportsWebSearch = agentData.supportsWebSearch ? 1 : 0;
    
    const result = await db.update(schema.agentManage)
      .set(data)
      .where(eq(schema.agentManage.id, id))
      .returning();
    
    console.log("Agent DB update completed")
    console.log("=== Agent DB update end ===")
    
    return result;
  },
  
  /**
   * Delete agent
   */
  delete: async (id: string) => {
    return await db.delete(schema.agentManage).where(eq(schema.agentManage.id, id));
  }
};

/**
 * Utility function to convert image data to data URL
 */
export function convertImageDataToDataUrl(imageData: any): string | null {
  if (!imageData) return null;
  
  try {
    // Handle various formats of image data
    if (imageData instanceof Uint8Array) {
      // SQLite stores as Uint8Array
      if (imageData.length < 100) {
        return null;
      }
      
      // Table image data is already converted to base64 string
      const base64String = Buffer.from(imageData).toString();
      return `data:image/png;base64,${base64String}`;
      
    } else if (typeof imageData === 'string') {
      // PostgreSQL stores as base64 string
      if (imageData.length < 100) {
        return null;
      }
      
      // Use as-is if already in data:image/ format
      if (imageData.startsWith('data:')) {
        return imageData;
      } else {
        // Convert regular base64 string to data URL
        return `data:image/png;base64,${imageData}`;
      }
      
    } else if (typeof imageData === 'object' && imageData !== null) {
      // Incorrectly stored case: ASCII code array or other object format
      if (Array.isArray(imageData)) {
        // ASCII code array case
        const base64String = String.fromCharCode(...imageData);
        if (base64String.length < 100) {
          return null;
        }
        return `data:image/png;base64,${base64String}`;
        
      } else if (imageData.type === 'Buffer' && imageData.data) {
        // Buffer object serialized to JSON case
        const buffer = Buffer.from(imageData.data);
        if (buffer.length < 100) {
          return null;
        }
        const base64String = buffer.toString('base64');
        return `data:image/png;base64,${base64String}`;
        
      } else {
        // Check if object has numeric keys (array-like format)
        const keys = Object.keys(imageData);
        const isNumericKeys = keys.every(key => !isNaN(parseInt(key)));
        
        if (isNumericKeys) {
          const values = keys.map(key => imageData[key]);
          const base64String = String.fromCharCode(...values);
          if (base64String.length < 100) {
            return null;
          }
          return `data:image/png;base64,${base64String}`;
        }
      }
    } else if (imageData && (imageData.type === 'Buffer' || Array.isArray(imageData))) {
      // JSON serialized buffer object case
      const buffer = Buffer.from(imageData);
      if (buffer.length < 100) {
        return null;
      }
      const base64String = buffer.toString();
      return `data:image/png;base64,${base64String}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error during image data conversion:', error);
    return null;
  }
}

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