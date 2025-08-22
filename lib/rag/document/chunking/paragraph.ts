// Paragraph-based chunking strategy

import { BaseChunkingStrategy } from './base';
import { ChunkingOptions, TextChunk, ChunkingStrategyType } from '../types';

export class ParagraphChunkingStrategy extends BaseChunkingStrategy {
  getType(): ChunkingStrategyType {
    return 'paragraph';
  }

  async chunk(text: string, options?: ChunkingOptions): Promise<TextChunk[]> {
    const opts = this.mergeOptions(options);
    this.validateOptions(opts);

    const paragraphs = this.splitIntoParagraphs(text);
    const chunks: TextChunk[] = [];
    const maxChunkSize = opts.maxChunkSize || opts.chunkSize!;
    const minChunkSize = opts.minChunkSize!;

    let currentChunk: string[] = [];
    let currentChunkSize = 0;
    let chunkStartIndex = 0;
    let currentIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphLength = paragraph.length;
      
      // If paragraph itself is too large, split it further
      if (paragraphLength > maxChunkSize) {
        // Save current chunk if any
        if (currentChunk.length > 0) {
          const chunkContent = currentChunk.join('\n\n');
          if (!this.isChunkTooSmall(chunkContent, minChunkSize)) {
            chunks.push(this.createChunk(
              chunkContent,
              chunkStartIndex,
              currentIndex
            ));
          }
          currentChunk = [];
          currentChunkSize = 0;
        }

        // Split large paragraph
        const subChunks = await this.splitLargeParagraph(paragraph, opts);
        for (const subChunk of subChunks) {
          chunks.push(this.createChunk(
            subChunk.content,
            currentIndex + subChunk.startIndex,
            currentIndex + subChunk.endIndex
          ));
        }

        chunkStartIndex = currentIndex + paragraphLength + 2;
      } else if (currentChunkSize + paragraphLength > maxChunkSize && currentChunk.length > 0) {
        // Create chunk with current paragraphs
        const chunkContent = currentChunk.join('\n\n');
        
        if (!this.isChunkTooSmall(chunkContent, minChunkSize)) {
          chunks.push(this.createChunk(
            chunkContent,
            chunkStartIndex,
            currentIndex
          ));
        }

        // Start new chunk with current paragraph
        currentChunk = [paragraph];
        currentChunkSize = paragraphLength;
        chunkStartIndex = currentIndex;
      } else {
        // Add paragraph to current chunk
        currentChunk.push(paragraph);
        currentChunkSize += paragraphLength + 2; // +2 for double newline
      }

      currentIndex += paragraphLength + 2;
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join('\n\n');
      
      if (!this.isChunkTooSmall(chunkContent, minChunkSize)) {
        chunks.push(this.createChunk(
          chunkContent,
          chunkStartIndex,
          Math.min(currentIndex, text.length)
        ));
      }
    }

    return chunks;
  }

  private splitIntoParagraphs(text: string): string[] {
    // Split by double newlines or multiple spaces followed by newlines
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return paragraphs;
  }

  private async splitLargeParagraph(paragraph: string, options: ChunkingOptions): Promise<TextChunk[]> {
    // For large paragraphs, fall back to sentence chunking
    const { SentenceChunkingStrategy } = await import('./sentence');
    const sentenceChunker = new SentenceChunkingStrategy(options);
    return sentenceChunker.chunk(paragraph, options);
  }
}
