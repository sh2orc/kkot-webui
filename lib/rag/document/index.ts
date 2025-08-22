// Document processing exports

export * from './types';
export * from './processor';
export * from './service';
export * from './chunking';

// Re-export commonly used items
export { DocumentProcessingService } from './service';
export { BaseDocumentProcessor } from './processor';
export { ChunkingStrategyFactory } from './chunking';

export type {
  DocumentProcessor,
  DocumentMetadata,
  ChunkingStrategy,
  ChunkingStrategyType,
  ChunkingOptions,
  TextChunk,
  ProcessedDocument,
  SupportedMimeType,
  SupportedFileType
} from './types';

export { DocumentProcessingError, SUPPORTED_MIME_TYPES } from './types';
