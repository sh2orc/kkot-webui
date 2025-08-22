// Document processing types

export interface DocumentProcessor {
  extractText(buffer: Buffer, mimeType: string): Promise<string>;
  extractMetadata(buffer: Buffer, mimeType: string): Promise<DocumentMetadata>;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  [key: string]: any;
}

export interface ChunkingStrategy {
  chunk(text: string, options?: ChunkingOptions): Promise<TextChunk[]>;
  getType(): ChunkingStrategyType;
}

export type ChunkingStrategyType = 
  | 'fixed_size'
  | 'sentence'
  | 'paragraph'
  | 'semantic'
  | 'sliding_window'
  | 'custom';

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separator?: string;
  minChunkSize?: number;
  maxChunkSize?: number;
  customRules?: Record<string, any>;
}

export interface TextChunk {
  content: string;
  startIndex: number;
  endIndex: number;
  metadata?: {
    pageNumber?: number;
    section?: string;
    [key: string]: any;
  };
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  mimeType: string;
  content: string;
  chunks: TextChunk[];
  metadata: DocumentMetadata;
  fileSize: number;
  fileHash: string;
  processingTime: number;
}

export class DocumentProcessingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export const SUPPORTED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'application/json': 'json',
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES;
export type SupportedFileType = typeof SUPPORTED_MIME_TYPES[SupportedMimeType];
