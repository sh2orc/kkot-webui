/**
 * DB type definitions that can be safely used in client
 * This file does not include server code
 */

// User type
export interface User {
  id: string | number;
  username: string;
  email: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Chat session type
export interface ChatSession {
  id: string | number;
  userId: string | number;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Chat message type
export interface ChatMessage {
  id: string | number;
  sessionId: string | number;
  role: 'user' | 'assistant';
  content: string;
  rating?: number; // -1 (dislike), 0 (neutral), +1 (like)
  createdAt?: Date;
}

// API connection type
export interface ApiConnection {
  id: string | number;
  type: string;
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Model setting type
export interface ModelSetting {
  id: string | number;
  connectionId: string | number;
  modelName: string;
  temperature: string;
  maxTokens: number;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Web search setting type
export interface WebSearchSetting {
  id: string | number;
  engine: string;
  apiKey?: string;
  url?: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Image setting type
export interface ImageSetting {
  id: string | number;
  provider: string;
  apiKey?: string;
  url?: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Audio setting type
export interface AudioSetting {
  id: string | number;
  provider: string;
  apiKey?: string;
  url?: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// System setting type
export interface SystemSetting {
  id: string | number;
  key: string;
  value?: string;
  updatedAt?: Date;
}

// LLM Server type
export interface LLMServer {
  id: string | number;
  provider: 'openai' | 'gemini' | 'ollama' | 'vllm' | 'custom';
  name: string;
  baseUrl: string;
  apiKey?: string;
  models?: string; // JSON string of available models
  enabled: boolean;
  isDefault: boolean;
  settings?: string; // JSON string for provider-specific settings
  createdAt?: Date;
  updatedAt?: Date;
}

// LLM Model type
export interface LLMModel {
  id: string | number;
  serverId: string | number;
  modelId: string; // Actual model ID (e.g., gpt-4, llama2)
  provider: string;
  enabled: boolean;
  isPublic: boolean; // Whether to expose to general users
  capabilities?: string; // JSON string for model capabilities
  contextLength?: number;
  supportsMultimodal: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Agent Manage type
export interface AgentManage {
  id: string | number;
  agentId: string;
  modelId: string | number;
  name: string;
  systemPrompt?: string;
  temperature: string;
  topK: number;
  topP: string;
  maxTokens: number;
  presencePenalty: string;
  frequencyPenalty: string;
  imageData?: Buffer | string; // BLOB for SQLite, Base64 text for PostgreSQL
  description?: string;
  enabled: boolean;
  parameterEnabled: boolean;
  supportsMultimodal: boolean;
  supportsDeepResearch: boolean;
  supportsWebSearch: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// API Management type
export interface ApiManagement {
  id: string;
  apiEnabled: boolean;
  openaiCompatible: boolean;
  corsEnabled: boolean;
  corsOrigins: string;
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number; // in seconds
  requireAuth: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// API Keys type
export interface ApiKeys {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  userId?: string | number;
  permissions: string; // JSON array
  rateLimitTier: 'basic' | 'premium' | 'unlimited';
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  allowedIps?: string; // JSON array of allowed IPs
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// API Usage type
export interface ApiUsage {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  tokensUsed: number;
  responseTimeMs: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

// DB type
export type DbType = 'sqlite' | 'postgresql'; 