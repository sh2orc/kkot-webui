// This file is for server-side only
import 'server-only';

import { eq, and, ne } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { generateId } from './utils';

// Get DB instance
const db = getDb();

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
        compressImage: schema.agentManage.compressImage,
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
    compressImage?: boolean;
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
      compressImage: agentData.compressImage === false ? 0 : 1 as any,
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
    compressImage: boolean;
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
    if (typeof agentData.compressImage === 'boolean') data.compressImage = agentData.compressImage ? 1 : 0;
    
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
