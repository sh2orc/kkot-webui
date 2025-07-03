import { ChatOpenAI } from "@langchain/openai";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * vLLM LLM implementation (using OpenAI compatible API)
 */
export class VLLMLLM extends BaseLLM {
  private client: ChatOpenAI;

  constructor(config: LLMModelConfig) {
    super(config);
    // vLLM provides OpenAI-compatible API, so we use ChatOpenAI class
    this.client = new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      streaming: config.streaming,
      openAIApiKey: config.apiKey || "dummy-api-key", // vLLM often doesn't require API key
      configuration: {
        baseURL: config.baseUrl || "http://localhost:8000/v1" // vLLM default endpoint
      }
    });
  }

  /**
   * Send message to vLLM model and receive response
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const functionCallOptions = this.prepareFunctionCallOptions(options?.functions);
    
    try {
      // Create client with dynamic options
      const dynamicClient = new ChatOpenAI({
        modelName: this.config.modelName,
        temperature: this.config.temperature,
        maxTokens: options?.maxTokens ?? this.config.maxTokens,
        topP: this.config.topP,
        frequencyPenalty: this.config.frequencyPenalty,
        presencePenalty: this.config.presencePenalty,
        streaming: this.config.streaming,
        openAIApiKey: "EMPTY",
        configuration: {
          baseURL: this.config.baseUrl
        }
      });
      
      const response = await dynamicClient.invoke(langChainMessages, functionCallOptions);
      
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
        provider: "vllm"
      };
    } catch (error) {
      console.error("Error occurred during vLLM API call:", error);
      throw error;
    }
  }

  /**
   * Send streaming request to vLLM model
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
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
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
   * Prepare function call options
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
   * Estimate token count (simple implementation)
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    // Simple estimation: approximately 3 tokens per 4 words in English
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
} 