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

// DB type
export type DbType = 'sqlite' | 'postgresql'; 