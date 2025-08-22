// Embedding provider factory

import { EmbeddingProvider, EmbeddingProviderConfig, EmbeddingError } from './types';
import { OpenAIEmbeddingProvider } from './openai';

export class EmbeddingProviderFactory {
  static create(config: EmbeddingProviderConfig): EmbeddingProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config);
      
      case 'gemini':
        // TODO: Implement Gemini embedding provider
        throw new EmbeddingError(
          'Gemini embedding provider not implemented yet',
          'NOT_IMPLEMENTED'
        );
      
      case 'ollama':
        // TODO: Implement Ollama embedding provider
        throw new EmbeddingError(
          'Ollama embedding provider not implemented yet',
          'NOT_IMPLEMENTED'
        );
      
      case 'custom':
        // TODO: Implement custom embedding provider
        throw new EmbeddingError(
          'Custom embedding provider not implemented yet',
          'NOT_IMPLEMENTED'
        );
      
      default:
        throw new EmbeddingError(
          `Unsupported embedding provider: ${config.provider}`,
          'UNSUPPORTED_PROVIDER'
        );
    }
  }
}
