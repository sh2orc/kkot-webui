import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * Ollama LLM 구현체
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
   * Ollama 모델에 메시지를 전송하고 응답을 받는 메서드
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
    
    // 토큰 사용량 계산 (추정치)
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
   * Ollama 모델에 스트리밍 요청을 보내는 메서드
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
      
      // 스트리밍 완료 후 토큰 사용량 계산 (추정치)
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
   * 토큰 수 추정 (간단한 구현)
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    // Simple estimation: approximately 3 tokens per 4 words in English
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
} 