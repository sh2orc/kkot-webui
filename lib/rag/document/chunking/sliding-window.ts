// Sliding window chunking strategy

import { BaseChunkingStrategy } from './base';
import { ChunkingOptions, TextChunk, ChunkingStrategyType } from '../types';

export class SlidingWindowChunkingStrategy extends BaseChunkingStrategy {
  getType(): ChunkingStrategyType {
    return 'sliding_window';
  }

  async chunk(text: string, options?: ChunkingOptions): Promise<TextChunk[]> {
    const opts = this.mergeOptions(options);
    this.validateOptions(opts);

    const windowSize = opts.chunkSize!;
    const stepSize = windowSize - opts.chunkOverlap!;
    const minSize = opts.minChunkSize!;
    const chunks: TextChunk[] = [];

    // Split text into tokens (words)
    const tokens = this.tokenize(text);
    const tokenPositions = this.getTokenPositions(text, tokens);

    if (tokens.length === 0) {
      return chunks;
    }

    let startTokenIndex = 0;

    while (startTokenIndex < tokens.length) {
      // Calculate end token index
      const endTokenIndex = Math.min(startTokenIndex + windowSize, tokens.length);
      
      // Get the actual text positions
      const startIndex = tokenPositions[startTokenIndex].start;
      const endIndex = tokenPositions[endTokenIndex - 1].end;
      
      // Extract chunk
      const chunkContent = text.substring(startIndex, endIndex);
      
      // Only add non-empty chunks that meet minimum size
      if (!this.isChunkTooSmall(chunkContent, minSize)) {
        chunks.push(this.createChunk(
          chunkContent,
          startIndex,
          endIndex
        ));
      }

      // Move window
      if (endTokenIndex >= tokens.length) {
        break;
      }
      
      startTokenIndex += stepSize;
    }

    return chunks;
  }

  private tokenize(text: string): string[] {
    // Split by whitespace and punctuation, but keep punctuation with words
    const tokens = text.match(/\S+/g) || [];
    return tokens;
  }

  private getTokenPositions(text: string, tokens: string[]): Array<{start: number, end: number}> {
    const positions: Array<{start: number, end: number}> = [];
    let currentPos = 0;

    for (const token of tokens) {
      const tokenStart = text.indexOf(token, currentPos);
      if (tokenStart !== -1) {
        positions.push({
          start: tokenStart,
          end: tokenStart + token.length
        });
        currentPos = tokenStart + token.length;
      }
    }

    return positions;
  }
}
