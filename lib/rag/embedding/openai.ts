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
      // Handle baseUrl that may or may not include /v1
      let baseUrl = this.config.baseUrl || 'https://api.openai.com';
      if (!baseUrl.endsWith('/v1') && !baseUrl.endsWith('/v1/')) {
        baseUrl = baseUrl.endsWith('/') ? `${baseUrl}v1` : `${baseUrl}/v1`;
      }
      // Remove trailing slash if exists
      baseUrl = baseUrl.replace(/\/$/, '');
      
      const url = `${baseUrl}/embeddings`;
      const requestBody: any = {
        model: this.config.model,
        input: texts,
      };
      
      // Only add dimensions for text-embedding-3-* models
      if (this.config.model.includes('text-embedding-3-') && this.dimensions) {
        requestBody.dimensions = this.dimensions;
      }
      
      console.log('Embedding API request:', {
        url,
        model: this.config.model,
        inputCount: texts.length,
        dimensions: requestBody.dimensions,
        baseUrl: this.config.baseUrl
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Embedding API error:', {
          status: response.status,
          error,
          url,
          model: this.config.model
        });
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
