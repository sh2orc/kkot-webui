// Chunking strategy factory

import { ChunkingStrategy, ChunkingStrategyType, ChunkingOptions, DocumentProcessingError } from '../types';
import { FixedSizeChunkingStrategy } from './fixed-size';
import { SentenceChunkingStrategy } from './sentence';
import { ParagraphChunkingStrategy } from './paragraph';
import { SlidingWindowChunkingStrategy } from './sliding-window';

export class ChunkingStrategyFactory {
  static create(type: ChunkingStrategyType, options?: ChunkingOptions): ChunkingStrategy {
    switch (type) {
      case 'fixed_size':
        return new FixedSizeChunkingStrategy(options);
      
      case 'sentence':
        return new SentenceChunkingStrategy(options);
      
      case 'paragraph':
        return new ParagraphChunkingStrategy(options);
      
      case 'sliding_window':
        return new SlidingWindowChunkingStrategy(options);
      
      case 'semantic':
        // TODO: Implement semantic chunking (requires embeddings)
        throw new DocumentProcessingError(
          'Semantic chunking not implemented yet',
          'NOT_IMPLEMENTED'
        );
      
      case 'custom':
        // TODO: Implement custom chunking with user-defined rules
        throw new DocumentProcessingError(
          'Custom chunking not implemented yet',
          'NOT_IMPLEMENTED'
        );
      
      default:
        throw new DocumentProcessingError(
          `Unknown chunking strategy: ${type}`,
          'UNKNOWN_STRATEGY'
        );
    }
  }

  static getAvailableStrategies(): ChunkingStrategyType[] {
    return ['fixed_size', 'sentence', 'paragraph', 'sliding_window'];
  }

  static getDefaultStrategy(): ChunkingStrategyType {
    return 'fixed_size';
  }
}
