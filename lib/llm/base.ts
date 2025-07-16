import { LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks, MessageContent, isMultimodalMessage, extractTextFromContent } from "./types";
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
      streaming: config.streaming ?? false,
      supportsMultimodal: config.supportsMultimodal ?? false
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
   * Convert LLM messages to LangChain messages with multimodal support
   */
  protected convertToLangChainMessages(messages: LLMMessage[]): BaseMessage[] {
    return messages.map(message => {
      const content = this.convertMessageContent(message.content);
      
      switch (message.role) {
        case "system":
          return new SystemMessage({ content });
        case "user":
          return new HumanMessage({ content });
        case "assistant":
          return new AIMessage({ content });
        case "function":
          return new FunctionMessage({
            content: typeof content === "string" ? content : JSON.stringify(content),
            name: message.name || "function"
          });
        default:
          return new HumanMessage({ content });
      }
    });
  }

  /**
   * Convert MessageContent to LangChain compatible format
   */
  private convertMessageContent(content: MessageContent): any {
    if (typeof content === "string") {
      return content;
    }
    
    // For multimodal content, convert to LangChain format
    return content.map(item => {
      if (item.type === "text") {
        return {
          type: "text",
          text: item.text
        };
      } else if (item.type === "image") {
        return {
          type: "image_url",
          image_url: item.image_url
        };
      }
      return item;
    });
  }

  /**
   * Check if the model supports multimodal input
   */
  protected supportsMultimodal(): boolean {
    return this.config.supportsMultimodal ?? false;
  }

  /**
   * Validate multimodal message compatibility
   */
  protected validateMultimodalMessage(message: LLMMessage): void {
    if (isMultimodalMessage(message) && !this.supportsMultimodal()) {
      throw new Error(`Model ${this.config.modelName} does not support multimodal input. Please use a text-only message or switch to a multimodal model.`);
    }
  }

  /**
   * Validate all messages for multimodal compatibility
   */
  protected validateMessages(messages: LLMMessage[]): void {
    messages.forEach(message => this.validateMultimodalMessage(message));
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