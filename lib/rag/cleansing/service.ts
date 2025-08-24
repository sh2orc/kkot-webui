// Data cleansing service

import { BaseDataCleanser } from './base';
import { LLMDataCleanser } from './llm';
import { CleansingOptions, LLMCleansingConfig, CleansingError } from './types';
import { getDb } from '@/lib/db/config';
import { ragCleansingConfigs, llmModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface CleansingServiceConfig {
  useLLM?: boolean;
  llmModelId?: string;
  defaultCleansingConfigId?: string;
}

export class CleansingService {
  private config: CleansingServiceConfig;

  constructor(config: CleansingServiceConfig = {}) {
    this.config = config;
  }

  async cleanseText(
    text: string,
    options?: CleansingOptions,
    cleansingConfigId?: string
  ): Promise<string> {
    const cleanser = await this.getCleanser(cleansingConfigId);
    return cleanser.cleanse(text, options);
  }

  async cleanseTexts(
    texts: string[],
    options?: CleansingOptions,
    cleansingConfigId?: string
  ): Promise<string[]> {
    const cleanser = await this.getCleanser(cleansingConfigId);
    return cleanser.cleanseChunks(texts, options);
  }

  async cleanseDocumentChunks(
    chunks: Array<{ content: string; [key: string]: any }>,
    options?: CleansingOptions,
    cleansingConfigId?: string
  ): Promise<Array<{ content: string; cleanedContent: string; [key: string]: any }>> {
    const cleanser = await this.getCleanser(cleansingConfigId);
    
    const cleanedChunks = await Promise.all(
      chunks.map(async (chunk) => ({
        ...chunk,
        cleanedContent: await cleanser.cleanse(chunk.content, options),
      }))
    );

    return cleanedChunks;
  }

  private async getCleanser(cleansingConfigId?: string): Promise<BaseDataCleanser> {
    const configId = cleansingConfigId || this.config.defaultCleansingConfigId;

    if (!this.config.useLLM || !configId) {
      return new BaseDataCleanser();
    }

    try {
      // Load cleansing configuration from database
      const db = getDb();
      const cleansingConfig = await db
        .select()
        .from(ragCleansingConfigs)
        .where(eq(ragCleansingConfigs.id, parseInt(configId)))
        .limit(1);

      if (cleansingConfig.length === 0) {
        console.warn(`Cleansing config ${configId} not found, using basic cleanser`);
        return new BaseDataCleanser();
      }

      const config = cleansingConfig[0];
      
      // If LLM model is specified, create LLM cleanser
      if (config.llmModelId) {
        const model = await db
          .select()
          .from(llmModels)
          .where(eq(llmModels.id, config.llmModelId))
          .limit(1);

        if (model.length > 0) {
          const llmConfig: LLMCleansingConfig = {
            modelId: model[0].modelId,
            basePrompt: config.cleansingPrompt || undefined,
          };

          const options: CleansingOptions = {
            removeHeaders: config.removeHeaders,
            removeFooters: config.removeFooters,
            removePageNumbers: config.removePageNumbers,
            normalizeWhitespace: config.normalizeWhitespace,
            fixEncoding: config.fixEncoding,
            customRules: config.customRules ? JSON.parse(config.customRules) : undefined,
          };

          const llmCleanser = new LLMDataCleanser(llmConfig);
          // Return a wrapped cleanser that applies the config options
          return {
            async cleanse(text: string, overrideOptions?: CleansingOptions) {
              return llmCleanser.cleanse(text, { ...options, ...overrideOptions });
            },
            async cleanseChunks(chunks: string[], overrideOptions?: CleansingOptions) {
              return llmCleanser.cleanseChunks(chunks, { ...options, ...overrideOptions });
            },
          } as BaseDataCleanser;
        }
      }

      // Fall back to basic cleanser with config options
      const options: CleansingOptions = {
        removeHeaders: config.removeHeaders,
        removeFooters: config.removeFooters,
        removePageNumbers: config.removePageNumbers,
        normalizeWhitespace: config.normalizeWhitespace,
        fixEncoding: config.fixEncoding,
        customRules: config.customRules ? JSON.parse(config.customRules) : undefined,
      };

      const baseCleanser = new BaseDataCleanser();
      return {
        async cleanse(text: string, overrideOptions?: CleansingOptions) {
          return baseCleanser.cleanse(text, { ...options, ...overrideOptions });
        },
        async cleanseChunks(chunks: string[], overrideOptions?: CleansingOptions) {
          return baseCleanser.cleanseChunks(chunks, { ...options, ...overrideOptions });
        },
      } as BaseDataCleanser;

    } catch (error) {
      console.error('Failed to load cleansing configuration:', error);
      return new BaseDataCleanser();
    }
  }

  async getAvailableCleansingConfigs() {
    try {
      const db = getDb();
      const configs = await db
        .select({
          id: ragCleansingConfigs.id,
          name: ragCleansingConfigs.name,
          isDefault: ragCleansingConfigs.isDefault,
        })
        .from(ragCleansingConfigs);
      
      return configs;
    } catch (error) {
      console.error('Failed to load cleansing configs:', error);
      return [];
    }
  }
}
