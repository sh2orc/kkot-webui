// Data cleansing types

export interface DataCleanser {
  cleanse(text: string, options?: CleansingOptions): Promise<string>;
  cleanseChunks(chunks: string[], options?: CleansingOptions): Promise<string[]>;
}

export interface CleansingOptions {
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
  normalizeWhitespace?: boolean;
  fixEncoding?: boolean;
  removeUrls?: boolean;
  removeEmails?: boolean;
  customRules?: CleansingRule[];
  llmModelId?: string;
  cleansingPrompt?: string;
}

export interface CleansingRule {
  pattern: string | RegExp;
  replacement: string;
  flags?: string;
}

export interface LLMCleansingConfig {
  modelId: string;
  basePrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class CleansingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CleansingError';
  }
}
