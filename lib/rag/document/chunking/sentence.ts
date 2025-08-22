// Sentence-based chunking strategy

import { BaseChunkingStrategy } from './base';
import { ChunkingOptions, TextChunk, ChunkingStrategyType } from '../types';

export class SentenceChunkingStrategy extends BaseChunkingStrategy {
  getType(): ChunkingStrategyType {
    return 'sentence';
  }

  async chunk(text: string, options?: ChunkingOptions): Promise<TextChunk[]> {
    const opts = this.mergeOptions(options);
    this.validateOptions(opts);

    const sentences = this.splitIntoSentences(text);
    const chunks: TextChunk[] = [];
    const maxChunkSize = opts.maxChunkSize || opts.chunkSize!;
    const minChunkSize = opts.minChunkSize!;

    let currentChunk: string[] = [];
    let currentChunkSize = 0;
    let chunkStartIndex = 0;
    let currentIndex = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;
      
      // If adding this sentence would exceed max size, create a chunk
      if (currentChunkSize + sentenceLength > maxChunkSize && currentChunk.length > 0) {
        const chunkContent = currentChunk.join(' ');
        
        if (!this.isChunkTooSmall(chunkContent, minChunkSize)) {
          chunks.push(this.createChunk(
            chunkContent,
            chunkStartIndex,
            currentIndex
          ));
        }

        // Start new chunk
        currentChunk = [sentence];
        currentChunkSize = sentenceLength;
        chunkStartIndex = currentIndex;
      } else {
        // Add sentence to current chunk
        currentChunk.push(sentence);
        currentChunkSize += sentenceLength + 1; // +1 for space
      }

      currentIndex += sentenceLength + 1;
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      
      if (!this.isChunkTooSmall(chunkContent, minChunkSize)) {
        chunks.push(this.createChunk(
          chunkContent,
          chunkStartIndex,
          text.length
        ));
      }
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Enhanced sentence splitting with common abbreviations handling
    const abbreviations = ['Mr.', 'Mrs.', 'Dr.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'Ph.D', 'M.D', 'B.A', 'M.A', 'B.S', 'M.S'];
    
    // Replace abbreviations temporarily
    let processedText = text;
    const replacements: Map<string, string> = new Map();
    
    abbreviations.forEach((abbr, index) => {
      const placeholder = `__ABBR_${index}__`;
      replacements.set(placeholder, abbr);
      processedText = processedText.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), placeholder);
    });

    // Split by sentence endings
    const sentenceEndings = /([.!?]+)(\s+|$)/g;
    const parts = processedText.split(sentenceEndings);
    
    const sentences: string[] = [];
    let currentSentence = '';

    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        // Main content
        currentSentence += parts[i];
      } else if (i % 3 === 1) {
        // Punctuation
        currentSentence += parts[i];
      } else {
        // Whitespace - end of sentence
        if (currentSentence.trim()) {
          // Restore abbreviations
          replacements.forEach((original, placeholder) => {
            currentSentence = currentSentence.replace(new RegExp(placeholder, 'g'), original);
          });
          
          sentences.push(currentSentence.trim());
          currentSentence = '';
        }
      }
    }

    // Don't forget the last sentence if no ending punctuation
    if (currentSentence.trim()) {
      replacements.forEach((original, placeholder) => {
        currentSentence = currentSentence.replace(new RegExp(placeholder, 'g'), original);
      });
      sentences.push(currentSentence.trim());
    }

    return sentences.filter(s => s.length > 0);
  }
}
