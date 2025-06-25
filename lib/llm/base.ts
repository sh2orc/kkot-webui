import { LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { BaseMessage, HumanMessage, SystemMessage, AIMessage, FunctionMessage } from "@langchain/core/messages";

/**
 * Base LLM class - abstract class that serves as the foundation for all LLM implementations
 */
export abstract class BaseLLM {
  protected config: LLMModelConfig;

  constructor(config: LLMModelConfig) {
    this.config = {
      ...config,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1024,
      topP: config.topP ?? 1.0,
      streaming: config.streaming ?? false
    };
  }

  /**
   * Method to send messages to the LLM and receive a response
   * @param messages Array of messages to send
   * @param options Request options
   */
  abstract chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;

  /**
   * Method to handle streaming responses
   * @param messages Array of messages to send
   * @param callbacks Streaming callbacks
   * @param options Request options
   */
  abstract streamChat(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMRequestOptions
  ): Promise<void>;

  /**
   * Convert LLM messages to LangChain messages
   */
  protected convertToLangChainMessages(messages: LLMMessage[]): BaseMessage[] {
    return messages.map(message => {
      switch (message.role) {
        case "system":
          return new SystemMessage(message.content);
        case "user":
          return new HumanMessage(message.content);
        case "assistant":
          return new AIMessage(message.content);
        case "function":
          return new FunctionMessage({
            content: message.content,
            name: message.name || "function"
          });
        default:
          return new HumanMessage(message.content);
      }
    });
  }

  /**
   * Get model configuration
   */
  getConfig(): LLMModelConfig {
    return { ...this.config };
  }

  /**
   * Update model configuration
   */
  updateConfig(config: Partial<LLMModelConfig>): void {
    this.config = { ...this.config, ...config };
  }
} 