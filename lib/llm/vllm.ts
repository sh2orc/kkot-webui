import { ChatOpenAI } from "@langchain/openai";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * vLLM LLM 구현체 (OpenAI 호환 API를 사용)
 */
export class VLLMLLM extends BaseLLM {
  private client: ChatOpenAI;

  constructor(config: LLMModelConfig) {
    super(config);
    // vLLM은 OpenAI 호환 API를 제공하므로 ChatOpenAI 클래스를 사용
    this.client = new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      streaming: config.streaming,
      openAIApiKey: config.apiKey || "dummy-api-key", // vLLM은 종종 API 키가 필요하지 않음
      configuration: {
        baseURL: config.baseUrl || "http://localhost:8000/v1" // vLLM 기본 엔드포인트
      }
    });
  }

  /**
   * vLLM 모델에 메시지를 전송하고 응답을 받는 메서드
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const functionCallOptions = this.prepareFunctionCallOptions(options?.functions);
    
    try {
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
        provider: "vllm"
      };
    } catch (error) {
      console.error("vLLM API 호출 중 오류 발생:", error);
      throw error;
    }
  }

  /**
   * vLLM 모델에 스트리밍 요청을 보내는 메서드
   */
  async streamChat(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMRequestOptions
  ): Promise<void> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const streamingClient = new ChatOpenAI({
      modelName: this.config.modelName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      frequencyPenalty: this.config.frequencyPenalty,
      presencePenalty: this.config.presencePenalty,
      streaming: true,
      openAIApiKey: this.config.apiKey || "dummy-api-key",
      configuration: {
        baseURL: this.config.baseUrl || "http://localhost:8000/v1"
      }
    });
    
    const functionCallOptions = this.prepareFunctionCallOptions(options?.functions);
    
    try {
      const stream = await streamingClient.stream(langChainMessages, functionCallOptions);
      
      let fullContent = "";
      
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
        provider: "vllm"
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
        type: "function",
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }
      })),
      tool_choice: functionOptions.forceFunctionName 
        ? { type: "function", function: { name: functionOptions.forceFunctionName } } 
        : undefined
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