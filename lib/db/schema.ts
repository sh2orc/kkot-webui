// This file is for server-side only
import 'server-only';

import { sqliteTable, text, integer, blob, primaryKey } from 'drizzle-orm/sqlite-core';
import { pgTable, serial, varchar, boolean, timestamp, text as pgText, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { DbType } from './types';

// Function to determine DB type
function getDbType(): DbType {
  return (process.env.DB_TYPE || 'sqlite') as DbType;
}

// SQLite tables
// Users table
export const users = getDbType() === 'sqlite' 
  ? sqliteTable('users', {
      id: text('id').primaryKey(),
      username: text('username').notNull(),
      email: text('email').notNull(),
      password: text('password').notNull(),
      role: text('role', { enum: ['user', 'admin', 'guest'] }).default('guest'),
      profileImage: text('profile_image'),
      // OAuth fields
      googleId: text('google_id'),
      oauthProvider: text('oauth_provider'),
      oauthLinkedAt: integer('oauth_linked_at', { mode: 'timestamp' }),
      oauthProfilePicture: text('oauth_profile_picture'),
      // Login tracking
      lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('users', {
      id: serial('id').primaryKey(),
      username: varchar('username', { length: 255 }).notNull(),
      email: varchar('email', { length: 255 }).notNull(),
      password: varchar('password', { length: 255 }).notNull(),
      role: varchar('role', { length: 50 }).default('user'),
      profileImage: text('profile_image'),
      // OAuth fields
      googleId: text('google_id'),
      oauthProvider: varchar('oauth_provider', { length: 50 }),
      oauthLinkedAt: timestamp('oauth_linked_at'),
      oauthProfilePicture: text('oauth_profile_picture'),
      // Login tracking
      lastLoginAt: timestamp('last_login_at'),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Chat session table
export const chatSessions = getDbType() === 'sqlite'
  ? sqliteTable('chat_sessions', {
      id: text('id').primaryKey(),
      userEmail: text('user_email').notNull(),
      title: text('title').notNull(),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('chat_sessions', {
      id: serial('id').primaryKey(),
      userEmail: varchar('user_email', { length: 255 }).notNull(),
      title: varchar('title', { length: 255 }).notNull(),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Chat message table
export const chatMessages = getDbType() === 'sqlite'
  ? sqliteTable('chat_messages', {
      id: text('id').primaryKey(),
      sessionId: text('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }),
      role: text('role', { enum: ['user', 'assistant'] }).notNull(),
      content: text('content').notNull(),
      contentType: text('content_type').default('text'), // 'text' or 'multimodal'
      attachments: text('attachments'), // JSON string for multimodal content
      rating: integer('rating').default(0), // -1 (dislike), 0 (neutral), +1 (like)
      createdAt: integer('created_at', { mode: 'timestamp' }),
    })
  : pgTable('chat_messages', {
      id: serial('id').primaryKey(),
      sessionId: serial('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }),
      role: varchar('role', { length: 50 }).notNull(),
      content: pgText('content').notNull(),
      contentType: varchar('content_type', { length: 50 }).default('text'),
      attachments: pgText('attachments'),
      rating: varchar('rating', { length: 10 }), // 'like', 'dislike', or null
      createdAt: timestamp('created_at').defaultNow(),
    });

// API connection setting table
export const apiConnections = getDbType() === 'sqlite'
  ? sqliteTable('api_connections', {
      id: text('id').primaryKey(),
      type: text('type', { enum: ['openai', 'gemini', 'ollama', 'vllm'] }).notNull(),
      name: text('name').notNull(),
      url: text('url').notNull(),
      apiKey: text('api_key'),
      enabled: integer('enabled', { mode: 'boolean' }).default(true),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('api_connections', {
      id: serial('id').primaryKey(),
      type: varchar('type', { length: 50 }).notNull(),
      name: varchar('name', { length: 255 }).notNull(),
      url: varchar('url', { length: 255 }).notNull(),
      apiKey: varchar('api_key', { length: 255 }),
      enabled: boolean('enabled').default(true),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Model setting table
export const modelSettings = getDbType() === 'sqlite'
  ? sqliteTable('model_settings', {
      id: text('id').primaryKey(),
      connectionId: text('connection_id').references(() => apiConnections.id, { onDelete: 'cascade' }),
      modelName: text('model_name').notNull(),
      temperature: text('temperature').default('0.7'),
      maxTokens: integer('max_tokens').default(2048),
      isDefault: integer('is_default', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('model_settings', {
      id: serial('id').primaryKey(),
      connectionId: serial('connection_id').references(() => apiConnections.id, { onDelete: 'cascade' }),
      modelName: varchar('model_name', { length: 255 }).notNull(),
      temperature: varchar('temperature', { length: 10 }).default('0.7'),
      maxTokens: integer('max_tokens').default(2048),
      isDefault: boolean('is_default').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Web search setting table
export const webSearchSettings = getDbType() === 'sqlite'
  ? sqliteTable('web_search_settings', {
      id: text('id').primaryKey(),
      engine: text('engine', { enum: ['searchxng', 'google', 'bing'] }).default('searchxng'),
      apiKey: text('api_key'),
      url: text('url'),
      enabled: integer('enabled', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('web_search_settings', {
      id: serial('id').primaryKey(),
      engine: varchar('engine', { length: 50 }).default('searchxng'),
      apiKey: varchar('api_key', { length: 255 }),
      url: varchar('url', { length: 255 }),
      enabled: boolean('enabled').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Image generation setting table
export const imageSettings = getDbType() === 'sqlite'
  ? sqliteTable('image_settings', {
      id: text('id').primaryKey(),
      provider: text('provider', { enum: ['openai', 'stability', 'local'] }).default('openai'),
      apiKey: text('api_key'),
      url: text('url'),
      enabled: integer('enabled', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('image_settings', {
      id: serial('id').primaryKey(),
      provider: varchar('provider', { length: 50 }).default('openai'),
      apiKey: varchar('api_key', { length: 255 }),
      url: varchar('url', { length: 255 }),
      enabled: boolean('enabled').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Audio setting table
export const audioSettings = getDbType() === 'sqlite'
  ? sqliteTable('audio_settings', {
      id: text('id').primaryKey(),
      provider: text('provider', { enum: ['openai', 'elevenlabs', 'local'] }).default('openai'),
      apiKey: text('api_key'),
      url: text('url'),
      enabled: integer('enabled', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('audio_settings', {
      id: serial('id').primaryKey(),
      provider: varchar('provider', { length: 50 }).default('openai'),
      apiKey: varchar('api_key', { length: 255 }),
      url: varchar('url', { length: 255 }),
      enabled: boolean('enabled').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// System setting table
export const systemSettings = getDbType() === 'sqlite'
  ? sqliteTable('system_settings', {
      id: text('id').primaryKey(),
      key: text('key').notNull(),
      value: text('value'),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('system_settings', {
      id: serial('id').primaryKey(),
      key: varchar('key', { length: 255 }).notNull(),
      value: pgText('value'),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// LLM Server configuration table
export const llmServers = getDbType() === 'sqlite'
  ? sqliteTable('llm_servers', {
      id: text('id').primaryKey(),
      provider: text('provider', { enum: ['openai', 'gemini', 'ollama', 'vllm', 'custom'] }).notNull(),
      name: text('name').notNull(),
      baseUrl: text('base_url').notNull(),
      apiKey: text('api_key'),
      models: text('models'), // JSON string of available models
      enabled: integer('enabled', { mode: 'boolean' }).default(true),
      isDefault: integer('is_default', { mode: 'boolean' }).default(false),
      settings: text('settings'), // JSON string for provider-specific settings
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('llm_servers', {
      id: serial('id').primaryKey(),
      provider: varchar('provider', { length: 50 }).notNull(),
      name: varchar('name', { length: 255 }).notNull(),
      baseUrl: varchar('base_url', { length: 500 }).notNull(),
      apiKey: varchar('api_key', { length: 500 }),
      models: pgText('models'), // JSON string of available models
      enabled: boolean('enabled').default(true),
      isDefault: boolean('is_default').default(false),
      settings: pgText('settings'), // JSON string for provider-specific settings
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// LLM Model management table
export const llmModels = getDbType() === 'sqlite'
  ? sqliteTable('llm_models', {
      id: text('id').primaryKey(),
      serverId: text('server_id').references(() => llmServers.id, { onDelete: 'cascade' }),
      modelId: text('model_id').notNull(), // Actual model ID (e.g., gpt-4, llama2, etc.)
      provider: text('provider').notNull(), // openai, ollama, etc.
      enabled: integer('enabled', { mode: 'boolean' }).default(true),
      isPublic: integer('is_public', { mode: 'boolean' }).default(false), // Whether to expose to general users
      capabilities: text('capabilities'), // JSON string for model capabilities
      contextLength: integer('context_length'),
      supportsMultimodal: integer('supports_multimodal', { mode: 'boolean' }).default(false), // Multimodal support
      supportsImageGeneration: integer('supports_image_generation', { mode: 'boolean' }).default(false), // Image generation support
      isEmbeddingModel: integer('is_embedding_model', { mode: 'boolean' }).default(false), // Embedding model flag
      isRerankingModel: integer('is_reranking_model', { mode: 'boolean' }).default(false), // Reranking model flag
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('llm_models', {
      id: serial('id').primaryKey(),
      serverId: serial('server_id').references(() => llmServers.id, { onDelete: 'cascade' }),
      modelId: varchar('model_id', { length: 255 }).notNull(),
      provider: varchar('provider', { length: 50 }).notNull(),
      enabled: boolean('enabled').default(true),
      isPublic: boolean('is_public').default(false),
      capabilities: pgText('capabilities'),
      contextLength: integer('context_length'),
      supportsMultimodal: boolean('supports_multimodal').default(false), // Multimodal support
      supportsImageGeneration: boolean('supports_image_generation').default(false), // Image generation support
      isEmbeddingModel: boolean('is_embedding_model').default(false), // Embedding model flag
      isRerankingModel: boolean('is_reranking_model').default(false), // Reranking model flag
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Agent management table
export const agentManage = getDbType() === 'sqlite'
  ? sqliteTable('agent_manage', {
      id: text('id').primaryKey(),
      agentId: text('agent_id').notNull().unique(),
      modelId: text('model_id').references(() => llmModels.id, { onDelete: 'cascade' }),
      name: text('name').notNull(),
      systemPrompt: text('system_prompt'),
      temperature: text('temperature').default('0.7'),
      topK: integer('top_k').default(50),
      topP: text('top_p').default('0.95'),
      maxTokens: integer('max_tokens').default(2048),
      presencePenalty: text('presence_penalty').default('0.0'),
      frequencyPenalty: text('frequency_penalty').default('0.0'),
      imageData: blob('image_data'),
      description: text('description'),
      enabled: integer('enabled', { mode: 'boolean' }).default(true),
      isPublic: integer('is_public', { mode: 'boolean' }).default(false), // Whether to expose to general users
      parameterEnabled: integer('parameter_enabled', { mode: 'boolean' }).default(true),
      supportsMultimodal: integer('supports_multimodal', { mode: 'boolean' }).default(false), // Multimodal support
      supportsDeepResearch: integer('supports_deep_research', { mode: 'boolean' }).default(true), // Deep Research support
      supportsWebSearch: integer('supports_web_search', { mode: 'boolean' }).default(true), // Web Search support
      compressImage: integer('compress_image', { mode: 'boolean' }).default(true), // Image compression
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('agent_manage', {
      id: serial('id').primaryKey(),
      agentId: varchar('agent_id', { length: 255 }).notNull().unique(),
      modelId: serial('model_id').references(() => llmModels.id, { onDelete: 'cascade' }),
      name: varchar('name', { length: 255 }).notNull(),
      systemPrompt: pgText('system_prompt'),
      temperature: varchar('temperature', { length: 10 }).default('0.7'),
      topK: integer('top_k').default(50),
      topP: varchar('top_p', { length: 10 }).default('0.95'),
      maxTokens: integer('max_tokens').default(2048),
      presencePenalty: varchar('presence_penalty', { length: 10 }).default('0.0'),
      frequencyPenalty: varchar('frequency_penalty', { length: 10 }).default('0.0'),
      imageData: text('image_data'), // PostgreSQL uses bytea type, but stores as base64 text
      description: pgText('description'),
      enabled: boolean('enabled').default(true),
      isPublic: boolean('is_public').default(false), // Whether to expose to general users
      parameterEnabled: boolean('parameter_enabled').default(true),
      supportsMultimodal: boolean('supports_multimodal').default(false), // Multimodal support
      supportsDeepResearch: boolean('supports_deep_research').default(true), // Deep Research support
      supportsWebSearch: boolean('supports_web_search').default(true), // Web Search support
      compressImage: boolean('compress_image').default(true), // Image compression
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// API management table
export const apiManagement = getDbType() === 'sqlite'
  ? sqliteTable('api_management', {
      id: text('id').primaryKey(),
      apiEnabled: integer('api_enabled', { mode: 'boolean' }).default(false),
      openaiCompatible: integer('openai_compatible', { mode: 'boolean' }).default(true),
      corsEnabled: integer('cors_enabled', { mode: 'boolean' }).default(true),
      corsOrigins: text('cors_origins').default('*'),
      rateLimitEnabled: integer('rate_limit_enabled', { mode: 'boolean' }).default(true),
      rateLimitRequests: integer('rate_limit_requests').default(1000),
      rateLimitWindow: integer('rate_limit_window').default(3600),
      requireAuth: integer('require_auth', { mode: 'boolean' }).default(true),
      apiKeyEnabled: integer('api_key_enabled', { mode: 'boolean' }).default(false),
      apiKeyEndpointLimited: integer('api_key_endpoint_limited', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('api_management', {
      id: varchar('id', { length: 255 }).primaryKey(),
      apiEnabled: boolean('api_enabled').default(false),
      openaiCompatible: boolean('openai_compatible').default(true),
      corsEnabled: boolean('cors_enabled').default(true),
      corsOrigins: varchar('cors_origins', { length: 500 }).default('*'),
      rateLimitEnabled: boolean('rate_limit_enabled').default(true),
      rateLimitRequests: integer('rate_limit_requests').default(1000),
      rateLimitWindow: integer('rate_limit_window').default(3600),
      requireAuth: boolean('require_auth').default(true),
      apiKeyEnabled: boolean('api_key_enabled').default(false),
      apiKeyEndpointLimited: boolean('api_key_endpoint_limited').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// API Keys table
export const apiKeys = getDbType() === 'sqlite'
  ? sqliteTable('api_keys', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      keyHash: text('key_hash').notNull().unique(),
      keyPrefix: text('key_prefix').notNull(),
      userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
      permissions: text('permissions').default('["chat", "models"]'), // JSON array
      rateLimitTier: text('rate_limit_tier').default('basic'), // basic, premium, unlimited
      maxRequestsPerHour: integer('max_requests_per_hour').default(100),
      maxRequestsPerDay: integer('max_requests_per_day').default(1000),
      allowedIps: text('allowed_ips'), // JSON array of allowed IPs
      expiresAt: integer('expires_at', { mode: 'timestamp' }),
      lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
      isActive: integer('is_active', { mode: 'boolean' }).default(true),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('api_keys', {
      id: varchar('id', { length: 255 }).primaryKey(),
      name: varchar('name', { length: 255 }).notNull(),
      keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
      keyPrefix: varchar('key_prefix', { length: 50 }).notNull(),
      userId: varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }),
      permissions: pgText('permissions').default('["chat", "models"]'),
      rateLimitTier: varchar('rate_limit_tier', { length: 50 }).default('basic'),
      maxRequestsPerHour: integer('max_requests_per_hour').default(100),
      maxRequestsPerDay: integer('max_requests_per_day').default(1000),
      allowedIps: pgText('allowed_ips'),
      expiresAt: timestamp('expires_at'),
      lastUsedAt: timestamp('last_used_at'),
      isActive: boolean('is_active').default(true),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// API Usage table
export const apiUsage = getDbType() === 'sqlite'
  ? sqliteTable('api_usage', {
      id: text('id').primaryKey(),
      apiKeyId: text('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }),
      endpoint: text('endpoint').notNull(),
      method: text('method').notNull(),
      statusCode: integer('status_code').notNull(),
      tokensUsed: integer('tokens_used').default(0),
      responseTimeMs: integer('response_time_ms').default(0),
      errorMessage: text('error_message'),
      ipAddress: text('ip_address'),
      userAgent: text('user_agent'),
      createdAt: integer('created_at', { mode: 'timestamp' }),
    })
  : pgTable('api_usage', {
      id: varchar('id', { length: 255 }).primaryKey(),
      apiKeyId: varchar('api_key_id', { length: 255 }).references(() => apiKeys.id, { onDelete: 'cascade' }),
      endpoint: varchar('endpoint', { length: 255 }).notNull(),
      method: varchar('method', { length: 10 }).notNull(),
      statusCode: integer('status_code').notNull(),
      tokensUsed: integer('tokens_used').default(0),
      responseTimeMs: integer('response_time_ms').default(0),
      errorMessage: pgText('error_message'),
      ipAddress: varchar('ip_address', { length: 45 }),
      userAgent: varchar('user_agent', { length: 500 }),
      createdAt: timestamp('created_at').defaultNow(),
    });

// RAG Vector Store Configuration table
export const ragVectorStores = getDbType() === 'sqlite'
  ? sqliteTable('rag_vector_stores', {
      id: integer('id').primaryKey(),
      name: text('name').notNull(),
      type: text('type', { enum: ['chromadb', 'pgvector', 'faiss'] }).notNull(),
      connectionString: text('connection_string'),
      apiKey: text('api_key'),
      settings: text('settings'), // JSON string for provider-specific settings
      enabled: integer('enabled', { mode: 'boolean' }).default(true),
      isDefault: integer('is_default', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_vector_stores', {
      id: serial('id').primaryKey(),
      name: varchar('name', { length: 255 }).notNull(),
      type: varchar('type', { length: 50 }).notNull(),
      connectionString: varchar('connection_string', { length: 500 }),
      apiKey: varchar('api_key', { length: 255 }),
      settings: pgText('settings'),
      enabled: boolean('enabled').default(true),
      isDefault: boolean('is_default').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// RAG Collections table
export const ragCollections = getDbType() === 'sqlite'
  ? sqliteTable('rag_collections', {
      id: integer('id').primaryKey(),
      vectorStoreId: integer('vector_store_id').references(() => ragVectorStores.id, { onDelete: 'cascade' }),
      name: text('name').notNull(),
      description: text('description'),
      embeddingModel: text('embedding_model').default('text-embedding-ada-002'),
      embeddingDimensions: integer('embedding_dimensions').default(1536),
      defaultChunkingStrategyId: integer('default_chunking_strategy_id').references(() => ragChunkingStrategies.id, { onDelete: 'set null' }),
      defaultCleansingConfigId: integer('default_cleansing_config_id').references(() => ragCleansingConfigs.id, { onDelete: 'set null' }),
      defaultRerankingStrategyId: integer('default_reranking_strategy_id').references(() => ragRerankingStrategies.id, { onDelete: 'set null' }),
      metadata: text('metadata'), // JSON string
      isActive: integer('is_active', { mode: 'boolean' }).default(true),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_collections', {
      id: serial('id').primaryKey(),
      vectorStoreId: serial('vector_store_id').references(() => ragVectorStores.id, { onDelete: 'cascade' }),
      name: varchar('name', { length: 255 }).notNull(),
      description: pgText('description'),
      embeddingModel: varchar('embedding_model', { length: 255 }).default('text-embedding-ada-002'),
      embeddingDimensions: integer('embedding_dimensions').default(1536),
      defaultChunkingStrategyId: serial('default_chunking_strategy_id').references(() => ragChunkingStrategies.id, { onDelete: 'set null' }),
      defaultCleansingConfigId: serial('default_cleansing_config_id').references(() => ragCleansingConfigs.id, { onDelete: 'set null' }),
      defaultRerankingStrategyId: serial('default_reranking_strategy_id').references(() => ragRerankingStrategies.id, { onDelete: 'set null' }),
      metadata: pgText('metadata'),
      isActive: boolean('is_active').default(true),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// RAG Documents table
export const ragDocuments = getDbType() === 'sqlite'
  ? sqliteTable('rag_documents', {
      id: integer('id').primaryKey(),
      collectionId: integer('collection_id').references(() => ragCollections.id, { onDelete: 'cascade' }),
      title: text('title').notNull(),
      filename: text('filename').notNull(),
      fileType: text('file_type').notNull(),
      fileSize: integer('file_size'),
      fileHash: text('file_hash'),
      contentType: text('content_type', { enum: ['pdf', 'docx', 'pptx', 'txt', 'html', 'markdown', 'csv', 'json'] }),
      rawContent: text('raw_content'),
      chunkingStrategyId: integer('chunking_strategy_id').references(() => ragChunkingStrategies.id, { onDelete: 'set null' }),
      cleansingConfigId: integer('cleansing_config_id').references(() => ragCleansingConfigs.id, { onDelete: 'set null' }),
      metadata: text('metadata'), // JSON string
      processingStatus: text('processing_status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
      errorMessage: text('error_message'),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_documents', {
      id: serial('id').primaryKey(),
      collectionId: serial('collection_id').references(() => ragCollections.id, { onDelete: 'cascade' }),
      title: varchar('title', { length: 255 }).notNull(),
      filename: varchar('filename', { length: 255 }).notNull(),
      fileType: varchar('file_type', { length: 50 }).notNull(),
      fileSize: integer('file_size'),
      fileHash: varchar('file_hash', { length: 255 }),
      contentType: varchar('content_type', { length: 50 }),
      rawContent: pgText('raw_content'),
      chunkingStrategyId: serial('chunking_strategy_id').references(() => ragChunkingStrategies.id, { onDelete: 'set null' }),
      cleansingConfigId: serial('cleansing_config_id').references(() => ragCleansingConfigs.id, { onDelete: 'set null' }),
      metadata: pgText('metadata'),
      processingStatus: varchar('processing_status', { length: 50 }).default('pending'),
      errorMessage: pgText('error_message'),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Document Chunks table
export const ragDocumentChunks = getDbType() === 'sqlite'
  ? sqliteTable('rag_document_chunks', {
      id: integer('id').primaryKey(),
      documentId: integer('document_id').references(() => ragDocuments.id, { onDelete: 'cascade' }),
      chunkIndex: integer('chunk_index').notNull(),
      content: text('content').notNull(),
      cleanedContent: text('cleaned_content'),
      embeddingVector: text('embedding_vector'), // JSON array
      metadata: text('metadata'), // JSON string
      tokenCount: integer('token_count'),
      createdAt: integer('created_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_document_chunks', {
      id: serial('id').primaryKey(),
      documentId: serial('document_id').references(() => ragDocuments.id, { onDelete: 'cascade' }),
      chunkIndex: integer('chunk_index').notNull(),
      content: pgText('content').notNull(),
      cleanedContent: pgText('cleaned_content'),
      embeddingVector: pgText('embedding_vector'),
      metadata: pgText('metadata'),
      tokenCount: integer('token_count'),
      createdAt: timestamp('created_at').defaultNow(),
    });

// Chunking Strategies table
export const ragChunkingStrategies = getDbType() === 'sqlite'
  ? sqliteTable('rag_chunking_strategies', {
      id: integer('id').primaryKey(),
      name: text('name').notNull().unique(),
      type: text('type', { enum: ['fixed_size', 'sentence', 'paragraph', 'semantic', 'sliding_window', 'custom'] }).notNull(),
      chunkSize: integer('chunk_size').default(1000),
      chunkOverlap: integer('chunk_overlap').default(200),
      separator: text('separator'),
      customRules: text('custom_rules'), // JSON string
      isDefault: integer('is_default', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_chunking_strategies', {
      id: serial('id').primaryKey(),
      name: varchar('name', { length: 255 }).notNull().unique(),
      type: varchar('type', { length: 50 }).notNull(),
      chunkSize: integer('chunk_size').default(1000),
      chunkOverlap: integer('chunk_overlap').default(200),
      separator: varchar('separator', { length: 255 }),
      customRules: pgText('custom_rules'),
      isDefault: boolean('is_default').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Data Cleansing Configurations table
export const ragCleansingConfigs = getDbType() === 'sqlite'
  ? sqliteTable('rag_cleansing_configs', {
      id: integer('id').primaryKey(),
      name: text('name').notNull().unique(),
      llmModelId: integer('llm_model_id').references(() => llmModels.id, { onDelete: 'set null' }),
      cleansingPrompt: text('cleansing_prompt'),
      removeHeaders: integer('remove_headers', { mode: 'boolean' }).default(true),
      removeFooters: integer('remove_footers', { mode: 'boolean' }).default(true),
      removePageNumbers: integer('remove_page_numbers', { mode: 'boolean' }).default(true),
      normalizeWhitespace: integer('normalize_whitespace', { mode: 'boolean' }).default(true),
      fixEncoding: integer('fix_encoding', { mode: 'boolean' }).default(true),
      customRules: text('custom_rules'), // JSON string
      isDefault: integer('is_default', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_cleansing_configs', {
      id: serial('id').primaryKey(),
      name: varchar('name', { length: 255 }).notNull().unique(),
      llmModelId: serial('llm_model_id').references(() => llmModels.id, { onDelete: 'set null' }),
      cleansingPrompt: pgText('cleansing_prompt'),
      removeHeaders: boolean('remove_headers').default(true),
      removeFooters: boolean('remove_footers').default(true),
      removePageNumbers: boolean('remove_page_numbers').default(true),
      normalizeWhitespace: boolean('normalize_whitespace').default(true),
      fixEncoding: boolean('fix_encoding').default(true),
      customRules: pgText('custom_rules'),
      isDefault: boolean('is_default').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Reranking Strategies table
export const ragRerankingStrategies = getDbType() === 'sqlite'
  ? sqliteTable('rag_reranking_strategies', {
      id: integer('id').primaryKey(),
      name: text('name').notNull().unique(),
      type: text('type', { enum: ['model_based', 'rule_based', 'hybrid', 'none'] }).notNull(),
      rerankingModelId: integer('reranking_model_id').references(() => llmModels.id, { onDelete: 'set null' }),
      topK: integer('top_k').default(10),
      minScore: text('min_score'), // Store as text for decimal precision
      settings: text('settings'), // JSON string
      isDefault: integer('is_default', { mode: 'boolean' }).default(false),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_reranking_strategies', {
      id: serial('id').primaryKey(),
      name: varchar('name', { length: 255 }).notNull().unique(),
      type: varchar('type', { length: 50 }).notNull(),
      rerankingModelId: serial('reranking_model_id').references(() => llmModels.id, { onDelete: 'set null' }),
      topK: integer('top_k').default(10),
      minScore: numeric('min_score', { precision: 10, scale: 4 }),
      settings: pgText('settings'),
      isDefault: boolean('is_default').default(false),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Batch Processing Jobs table
export const ragBatchJobs = getDbType() === 'sqlite'
  ? sqliteTable('rag_batch_jobs', {
      id: integer('id').primaryKey(),
      jobType: text('job_type', { enum: ['import', 'reindex', 'cleanse', 'delete'] }).notNull(),
      collectionId: integer('collection_id').references(() => ragCollections.id, { onDelete: 'cascade' }),
      status: text('status', { enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] }).default('pending'),
      totalItems: integer('total_items').default(0),
      processedItems: integer('processed_items').default(0),
      failedItems: integer('failed_items').default(0),
      settings: text('settings'), // JSON string
      errorLog: text('error_log'), // JSON array
      startedAt: integer('started_at', { mode: 'timestamp' }),
      completedAt: integer('completed_at', { mode: 'timestamp' }),
      createdAt: integer('created_at', { mode: 'timestamp' }),
    })
  : pgTable('rag_batch_jobs', {
      id: serial('id').primaryKey(),
      jobType: varchar('job_type', { length: 50 }).notNull(),
      collectionId: serial('collection_id').references(() => ragCollections.id, { onDelete: 'cascade' }),
      status: varchar('status', { length: 50 }).default('pending'),
      totalItems: integer('total_items').default(0),
      processedItems: integer('processed_items').default(0),
      failedItems: integer('failed_items').default(0),
      settings: pgText('settings'),
      errorLog: pgText('error_log'),
      startedAt: timestamp('started_at'),
      completedAt: timestamp('completed_at'),
      createdAt: timestamp('created_at').defaultNow(),
    });

// Groups table for group-based access control
export const groups = getDbType() === 'sqlite'
  ? sqliteTable('groups', {
      id: text('id').primaryKey(),
      name: text('name').notNull().unique(),
      description: text('description'),
      isSystem: integer('is_system', { mode: 'boolean' }).default(false),
      isActive: integer('is_active', { mode: 'boolean' }).default(true),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('groups', {
      id: varchar('id', { length: 255 }).primaryKey(),
      name: varchar('name', { length: 255 }).notNull().unique(),
      description: pgText('description'),
      isSystem: boolean('is_system').default(false),
      isActive: boolean('is_active').default(true),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// User Groups junction table
export const userGroups = getDbType() === 'sqlite'
  ? sqliteTable('user_groups', {
      userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
      groupId: text('group_id').references(() => groups.id, { onDelete: 'cascade' }),
      assignedAt: integer('assigned_at', { mode: 'timestamp' }),
      assignedBy: text('assigned_by').references(() => users.id),
    }, (table) => ({
      pk: primaryKey({ columns: [table.userId, table.groupId] }),
    }))
  : pgTable('user_groups', {
      userId: varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }),
      groupId: varchar('group_id', { length: 255 }).references(() => groups.id, { onDelete: 'cascade' }),
      assignedAt: timestamp('assigned_at').defaultNow(),
      assignedBy: varchar('assigned_by', { length: 255 }).references(() => users.id),
    }, (table) => ({
      pk: primaryKey({ columns: [table.userId, table.groupId] }),
    }));

// Group Resource Permissions table
export const groupResourcePermissions = getDbType() === 'sqlite'
  ? sqliteTable('group_resource_permissions', {
      id: text('id').primaryKey(),
      groupId: text('group_id').references(() => groups.id, { onDelete: 'cascade' }),
      resourceType: text('resource_type', { enum: ['agent', 'model', 'rag_collection', 'vector_store'] }).notNull(),
      resourceId: text('resource_id').notNull(), // ID of the specific resource
      permissions: text('permissions').notNull(), // JSON array of permissions: ['read', 'write', 'delete']
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('group_resource_permissions', {
      id: varchar('id', { length: 255 }).primaryKey(),
      groupId: varchar('group_id', { length: 255 }).references(() => groups.id, { onDelete: 'cascade' }),
      resourceType: varchar('resource_type', { length: 50 }).notNull(),
      resourceId: varchar('resource_id', { length: 255 }).notNull(),
      permissions: pgText('permissions').notNull(),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Activity Logs table
export const activityLogs = getDbType() === 'sqlite'
  ? sqliteTable('activity_logs', {
      id: text('id').primaryKey(),
      userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
      action: text('action').notNull(),
      resourceType: text('resource_type'),
      resourceId: text('resource_id'),
      ipAddress: text('ip_address'),
      userAgent: text('user_agent'),
      createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
    })
  : pgTable('activity_logs', {
      id: varchar('id', { length: 255 }).primaryKey(),
      userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
      action: varchar('action', { length: 255 }).notNull(),
      resourceType: varchar('resource_type', { length: 255 }),
      resourceId: varchar('resource_id', { length: 255 }),
      ipAddress: varchar('ip_address', { length: 255 }),
      userAgent: text('user_agent'),
      createdAt: timestamp('created_at').defaultNow(),
    });

// Export activity log types
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

 