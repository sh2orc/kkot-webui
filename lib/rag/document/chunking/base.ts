// Base chunking strategy

import { ChunkingStrategy, ChunkingOptions, TextChunk, ChunkingStrategyType } from '../types';

export abstract class BaseChunkingStrategy implements ChunkingStrategy {
  protected options: ChunkingOptions;

  constructor(options: ChunkingOptions = {}) {
    this.options = {
      chunkSize: 1000,
      chunkOverlap: 200,
      minChunkSize: 100,
      maxChunkSize: 2000,
      ...options,
    };
  }

  abstract chunk(text: string, options?: ChunkingOptions): Promise<TextChunk[]>;
  abstract getType(): ChunkingStrategyType;

  protected validateOptions(options: ChunkingOptions): void {
    if (options.chunkSize !== undefined && options.chunkSize <= 0) {
      throw new Error('Chunk size must be positive');
    }

    if (options.chunkOverlap !== undefined && options.chunkOverlap < 0) {
      throw new Error('Chunk overlap cannot be negative');
    }

    if (options.chunkOverlap !== undefined && options.chunkSize !== undefined &&
        options.chunkOverlap >= options.chunkSize) {
      throw new Error('Chunk overlap must be less than chunk size');
    }

    if (options.minChunkSize !== undefined && options.maxChunkSize !== undefined &&
        options.minChunkSize > options.maxChunkSize) {
      throw new Error('Min chunk size cannot be greater than max chunk size');
    }
  }

  protected mergeOptions(options?: ChunkingOptions): ChunkingOptions {
    return { ...this.options, ...options };
  }

  protected createChunk(
    content: string, 
    startIndex: number, 
    endIndex: number,
    metadata?: Record<string, any>
  ): TextChunk {
    return {
      content: content.trim(),
      startIndex,
      endIndex,
      metadata,
    };
  }

  protected isChunkTooSmall(chunk: string, minSize: number): boolean {
    return chunk.trim().length < minSize;
  }

  protected isChunkTooLarge(chunk: string, maxSize: number): boolean {
    return chunk.trim().length > maxSize;
  }
}
