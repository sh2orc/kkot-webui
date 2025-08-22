// Document processing service

import * as crypto from 'crypto';
import { 
  ProcessedDocument, 
  DocumentProcessingError, 
  ChunkingStrategyType,
  ChunkingOptions,
  SUPPORTED_MIME_TYPES
} from './types';
import { BaseDocumentProcessor } from './processor';
import { ChunkingStrategyFactory } from './chunking';

export interface DocumentProcessingOptions {
  chunkingStrategy: ChunkingStrategyType;
  chunkingOptions?: ChunkingOptions;
  extractMetadata?: boolean;
}

export class DocumentProcessingService {
  private processor: BaseDocumentProcessor;

  constructor() {
    this.processor = new BaseDocumentProcessor();
  }

  async processDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: DocumentProcessingOptions
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();

    // Validate mime type
    if (!SUPPORTED_MIME_TYPES[mimeType as keyof typeof SUPPORTED_MIME_TYPES]) {
      throw new DocumentProcessingError(
        `Unsupported MIME type: ${mimeType}`,
        'UNSUPPORTED_MIME_TYPE'
      );
    }

    try {
      // Extract text
      const content = await this.processor.extractText(buffer, mimeType);
      
      // Extract metadata if requested
      const metadata = options.extractMetadata 
        ? await this.processor.extractMetadata(buffer, mimeType)
        : {};

      // Create chunking strategy
      const chunkingStrategy = ChunkingStrategyFactory.create(
        options.chunkingStrategy,
        options.chunkingOptions
      );

      // Chunk the document
      const chunks = await chunkingStrategy.chunk(content, options.chunkingOptions);

      // Calculate file hash
      const fileHash = this.calculateFileHash(buffer);

      const processingTime = Date.now() - startTime;

      return {
        id: this.generateDocumentId(),
        filename,
        mimeType,
        content,
        chunks,
        metadata,
        fileSize: buffer.length,
        fileHash,
        processingTime,
      };
    } catch (error) {
      if (error instanceof DocumentProcessingError) {
        throw error;
      }
      throw new DocumentProcessingError(
        `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROCESSING_ERROR'
      );
    }
  }

  async processDocuments(
    documents: Array<{
      buffer: Buffer;
      filename: string;
      mimeType: string;
    }>,
    options: DocumentProcessingOptions
  ): Promise<ProcessedDocument[]> {
    const results: ProcessedDocument[] = [];
    
    for (const doc of documents) {
      try {
        const processed = await this.processDocument(
          doc.buffer,
          doc.filename,
          doc.mimeType,
          options
        );
        results.push(processed);
      } catch (error) {
        console.error(`Failed to process document ${doc.filename}:`, error);
        // Continue processing other documents
      }
    }

    return results;
  }

  private calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private generateDocumentId(): string {
    return crypto.randomUUID();
  }

  getSupportedMimeTypes(): string[] {
    return Object.keys(SUPPORTED_MIME_TYPES);
  }

  getSupportedFileTypes(): string[] {
    return Object.values(SUPPORTED_MIME_TYPES);
  }

  getAvailableChunkingStrategies(): ChunkingStrategyType[] {
    return ChunkingStrategyFactory.getAvailableStrategies();
  }
}
