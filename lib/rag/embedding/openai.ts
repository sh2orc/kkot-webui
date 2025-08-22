// OpenAI embedding provider

import { EmbeddingProvider, EmbeddingProviderConfig, EmbeddingError } from './types';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private config: EmbeddingProviderConfig;
  private dimensions: number;

  constructor(config: EmbeddingProviderConfig) {
    this.config = config;
    
    // Set dimensions based on model
    switch (config.model) {
      case 'text-embedding-3-small':
        this.dimensions = config.dimensions || 1536;
        break;
      case 'text-embedding-3-large':
        this.dimensions = config.dimensions || 3072;
        break;
      case 'text-embedding-ada-002':
        this.dimensions = 1536;
        break;
      default:
        this.dimensions = config.dimensions || 1536;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const apiKey = this.config.apiKey || process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new EmbeddingError('OpenAI embedding API key is required', 'MISSING_API_KEY');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
          dimensions: this.dimensions !== 1536 ? this.dimensions : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new EmbeddingError(
          `OpenAI API error: ${response.status} - ${error}`,
          'API_ERROR'
        );
      }

      const data = await response.json();
      
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error;
      }
      throw new EmbeddingError(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR'
      );
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
