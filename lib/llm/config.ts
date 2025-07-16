import { LLMModelConfig, LLMProvider } from "./types";

/**
 * Environment configuration for LLM library
 */
export interface LLMEnvironmentConfig {
  // OpenAI Configuration
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiDefaultModel?: string;

  // Gemini Configuration
  geminiApiKey?: string;
  geminiDefaultModel?: string;

  // Ollama Configuration
  ollamaBaseUrl?: string;
  ollamaDefaultModel?: string;

  // vLLM Configuration
  vllmBaseUrl?: string;
  vllmDefaultModel?: string;

  // Default Provider
  defaultProvider?: LLMProvider;

  // Default Parameters
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  defaultTopP?: number;
}

/**
 * Load environment variables
 */
export function loadEnvironmentConfig(): LLMEnvironmentConfig {
  // In browser environments, process.env might not be available
  const env = typeof process !== 'undefined' && process.env ? process.env : {} as Record<string, string | undefined>;

  return {
    // OpenAI Configuration
    openaiApiKey: env.OPENAI_API_KEY,
    openaiBaseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiDefaultModel: env.DEFAULT_OPENAI_MODEL || 'gpt-3.5-turbo',

    // Gemini Configuration
    geminiApiKey: env.GEMINI_API_KEY,
    geminiDefaultModel: env.DEFAULT_GEMINI_MODEL || 'gemini-pro',

    // Ollama Configuration
    ollamaBaseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaDefaultModel: env.DEFAULT_OLLAMA_MODEL || 'llama3',

    // vLLM Configuration
    vllmBaseUrl: env.VLLM_BASE_URL || 'http://localhost:8000/v1',
    vllmDefaultModel: env.DEFAULT_VLLM_MODEL || 'llama3',

    // Default Provider
    defaultProvider: (env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai',

    // Default Parameters
    defaultTemperature: env.DEFAULT_TEMPERATURE ? parseFloat(env.DEFAULT_TEMPERATURE) : 0.7,
    defaultMaxTokens: env.DEFAULT_MAX_TOKENS ? parseInt(env.DEFAULT_MAX_TOKENS, 10) : 1024,
    defaultTopP: env.DEFAULT_TOP_P ? parseFloat(env.DEFAULT_TOP_P) : 1.0,
  };
}

/**
 * Get default model configuration based on environment
 */
export function getDefaultModelConfig(provider?: LLMProvider): LLMModelConfig {
  const config = loadEnvironmentConfig();
  const selectedProvider = provider || config.defaultProvider || 'openai';

  // Initialize with required modelName property
  const modelConfig: LLMModelConfig = {
    provider: selectedProvider,
    modelName: 'default', // Will be overridden below
    temperature: config.defaultTemperature,
    maxTokens: config.defaultMaxTokens,
    topP: config.defaultTopP,
  };

  // Set provider-specific configuration
  switch (selectedProvider) {
    case 'openai':
      modelConfig.modelName = config.openaiDefaultModel || 'gpt-3.5-turbo';
      modelConfig.apiKey = config.openaiApiKey;
      modelConfig.baseUrl = config.openaiBaseUrl;
      break;
    case 'gemini':
      modelConfig.modelName = config.geminiDefaultModel || 'gemini-pro';
      modelConfig.apiKey = config.geminiApiKey;
      break;
    case 'ollama':
      modelConfig.modelName = config.ollamaDefaultModel || 'llama3';
      modelConfig.baseUrl = config.ollamaBaseUrl;
      break;
    case 'vllm':
      modelConfig.modelName = config.vllmDefaultModel || 'llama3';
      modelConfig.baseUrl = config.vllmBaseUrl;
      break;
  }

  return modelConfig;
} 