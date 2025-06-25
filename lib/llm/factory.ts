import { BaseLLM } from "./base";
import { OpenAILLM } from "./openai";
import { GeminiLLM } from "./gemini";
import { OllamaLLM } from "./ollama";
import { VLLMLLM } from "./vllm";
import { LLMModelConfig, LLMProvider } from "./types";
import { getDefaultModelConfig } from "./config";

/**
 * LLM Factory class - Creates instances for various LLM providers
 */
export class LLMFactory {
  /**
   * Create an LLM instance with the specified provider and configuration
   * @param config LLM model configuration
   * @returns Created LLM instance
   */
  static create(config: LLMModelConfig): BaseLLM {
    switch (config.provider) {
      case "openai":
        return new OpenAILLM(config);
      case "gemini":
        return new GeminiLLM(config);
      case "ollama":
        return new OllamaLLM(config);
      case "vllm":
        return new VLLMLLM(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Get default model name for a provider
   * @param provider LLM provider
   * @returns Default model name
   */
  static getDefaultModelName(provider: LLMProvider): string {
    switch (provider) {
      case "openai":
        return "gpt-3.5-turbo";
      case "gemini":
        return "gemini-pro";
      case "ollama":
        return "llama3";
      case "vllm":
        return "llama3";
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Create an LLM instance with default settings
   * @param provider LLM provider
   * @param apiKey API key (optional)
   * @returns Created LLM instance
   */
  static createDefault(provider: LLMProvider, apiKey?: string): BaseLLM {
    // Get default configuration from environment
    const config = getDefaultModelConfig(provider);
    
    // Override API key if provided
    if (apiKey) {
      config.apiKey = apiKey;
    }
    
    return this.create(config);
  }
} 