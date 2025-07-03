import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * Ollama LLM implementation
 */
export class OllamaLLM extends BaseLLM {
  private client: ChatOllama;

  constructor(config: LLMModelConfig) {
    super(config);
    this.client = new ChatOllama({
      model: config.modelName,
      temperature: config.temperature,
      baseUrl: config.baseUrl || "http://localhost:11434"
    });
  }

  /**
   * Send message to Ollama model and receive response
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    // Create client with dynamic options
    const dynamicClient = new ChatOllama({
      model: this.config.modelName,
      temperature: this.config.temperature,
      numCtx: options?.maxTokens ?? this.config.maxTokens, // Ollama uses numCtx for context window
      topP: this.config.topP,
      baseUrl: this.config.baseUrl || "http://localhost:11434",
    });
    
    const response = await dynamicClient.invoke(langChainMessages);
    
    // Calculate token usage (estimated)
    const promptTokens = this.estimateTokenCount(messages);
    const completionTokens = this.estimateTokenCount([{ role: "assistant", content: response.content.toString() }]);
    
    return {
      content: response.content.toString(),
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens
      },
      modelName: this.config.modelName,
      provider: "ollama"
    };
  }

  /**
   * Send streaming request to Ollama model
   */
  async streamChat(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMRequestOptions
  ): Promise<void> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const streamingClient = new ChatOllama({
      model: this.config.modelName,
      temperature: this.config.temperature,
      numCtx: options?.maxTokens ?? this.config.maxTokens,
      topP: this.config.topP,
      baseUrl: this.config.baseUrl || "http://localhost:11434"
    });
    
    const stream = await streamingClient.stream(langChainMessages);
    
    let fullContent = "";
    
    try {
      for await (const chunk of stream) {
        if (chunk instanceof AIMessageChunk) {
          const content = chunk.content;
          if (content !== undefined && content !== null) {
            const contentStr = content.toString();
            fullContent += contentStr;
            if (callbacks.onToken) {
              callbacks.onToken(contentStr);
            }
          }
        }
      }
      
      // Calculate token usage after streaming (estimated)
      const promptTokens = this.estimateTokenCount(messages);
      const completionTokens = this.estimateTokenCount([{ role: "assistant", content: fullContent }]);
      
      const response: LLMResponse = {
        content: fullContent,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens
        },
        modelName: this.config.modelName,
        provider: "ollama"
      };
      
      if (callbacks.onComplete) {
        callbacks.onComplete(response);
      }
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Estimate token count (simple implementation)
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    // Simple estimation: approximately 3 tokens per 4 words in English
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
} 