// This file is for server-side only
import 'server-only';

import { sqliteTable, text, integer, blob, primaryKey } from 'drizzle-orm/sqlite-core';
import { pgTable, serial, varchar, boolean, timestamp, text as pgText } from 'drizzle-orm/pg-core';
import { DbType } from './types';

// DB 타입을 결정하는 함수
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
      role: text('role', { enum: ['user', 'admin'] }).default('user'),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('users', {
      id: serial('id').primaryKey(),
      username: varchar('username', { length: 255 }).notNull(),
      email: varchar('email', { length: 255 }).notNull(),
      password: varchar('password', { length: 255 }).notNull(),
      role: varchar('role', { length: 50 }).default('user'),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    });

// Chat session table
export const chatSessions = getDbType() === 'sqlite'
  ? sqliteTable('chat_sessions', {
      id: text('id').primaryKey(),
      userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
      title: text('title').notNull(),
      createdAt: integer('created_at', { mode: 'timestamp' }),
      updatedAt: integer('updated_at', { mode: 'timestamp' }),
    })
  : pgTable('chat_sessions', {
      id: serial('id').primaryKey(),
      userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }),
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
      createdAt: integer('created_at', { mode: 'timestamp' }),
    })
  : pgTable('chat_messages', {
      id: serial('id').primaryKey(),
      sessionId: serial('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }),
      role: varchar('role', { length: 50 }).notNull(),
      content: pgText('content').notNull(),
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
      parameterEnabled: integer('parameter_enabled', { mode: 'boolean' }).default(true),
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
      parameterEnabled: boolean('parameter_enabled').default(true),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    }); 