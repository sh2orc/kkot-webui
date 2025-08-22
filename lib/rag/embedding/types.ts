// Embedding provider types

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

export interface EmbeddingProviderConfig {
  provider: 'openai' | 'gemini' | 'ollama' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  dimensions?: number;
}

export class EmbeddingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'EmbeddingError';
  }
}
