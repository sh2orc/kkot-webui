// Fixed size chunking strategy

import { BaseChunkingStrategy } from './base';
import { ChunkingOptions, TextChunk, ChunkingStrategyType } from '../types';

export class FixedSizeChunkingStrategy extends BaseChunkingStrategy {
  getType(): ChunkingStrategyType {
    return 'fixed_size';
  }

  async chunk(text: string, options?: ChunkingOptions): Promise<TextChunk[]> {
    const opts = this.mergeOptions(options);
    this.validateOptions(opts);

    const chunks: TextChunk[] = [];
    const chunkSize = opts.chunkSize!;
    const overlap = opts.chunkOverlap!;
    const minSize = opts.minChunkSize!;

    let startIndex = 0;

    while (startIndex < text.length) {
      // Calculate end index
      let endIndex = Math.min(startIndex + chunkSize, text.length);
      
      // Try to find a good breaking point (space, newline, punctuation)
      if (endIndex < text.length) {
        const breakPoint = this.findBreakPoint(text, startIndex, endIndex);
        if (breakPoint > startIndex + minSize) {
          endIndex = breakPoint;
        }
      }

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

      // Move to next chunk with overlap
      if (endIndex >= text.length) {
        break;
      }
      
      startIndex = endIndex - overlap;
    }

    return chunks;
  }

  private findBreakPoint(text: string, start: number, end: number): number {
    // Look for natural breaking points in reverse order
    const breakChars = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' '];
    
    for (const breakChar of breakChars) {
      let lastIndex = text.lastIndexOf(breakChar, end);
      
      // Make sure we don't go too far back
      if (lastIndex > start + (end - start) * 0.5) {
        return lastIndex + breakChar.length;
      }
    }

    // If no good break point found, return original end
    return end;
  }
}
