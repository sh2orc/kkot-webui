import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * Gemini LLM 구현체
 */
export class GeminiLLM extends BaseLLM {
  private client: ChatGoogleGenerativeAI;

  constructor(config: LLMModelConfig) {
    super(config);
    this.client = new ChatGoogleGenerativeAI({
      model: config.modelName,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      topP: config.topP,
      apiKey: config.apiKey
    });
  }

  /**
   * Gemini 모델에 메시지를 전송하고 응답을 받는 메서드
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const functionCallOptions = this.prepareFunctionCallOptions(options?.functions);
    
    const response = await this.client.invoke(langChainMessages, functionCallOptions);
    
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
      provider: "gemini"
    };
  }

  /**
   * Gemini 모델에 스트리밍 요청을 보내는 메서드
   */
  async streamChat(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMRequestOptions
  ): Promise<void> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const streamingClient = new ChatGoogleGenerativeAI({
      model: this.config.modelName,
      temperature: this.config.temperature,
      maxOutputTokens: this.config.maxTokens,
      topP: this.config.topP,
      apiKey: this.config.apiKey,
      streaming: true
    });
    
    const functionCallOptions = this.prepareFunctionCallOptions(options?.functions);
    
    const stream = await streamingClient.stream(langChainMessages, functionCallOptions);
    
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
        provider: "gemini"
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
   * 함수 호출 옵션 준비
   */
  private prepareFunctionCallOptions(functionOptions?: LLMFunctionCallOptions): Record<string, any> {
    if (!functionOptions) return {};
    
    return {
      tools: functionOptions.functions.map(fn => ({
        function_declarations: [
          {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
          }
        ]
      }))
    };
  }

  /**
   * 토큰 수 추정 (간단한 구현)
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    // 단순한 추정: 영어 기준으로 단어 4개당 약 3토큰
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
} 