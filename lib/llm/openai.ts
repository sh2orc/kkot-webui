import { ChatOpenAI } from "@langchain/openai";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * OpenAI LLM implementation
 */
export class OpenAILLM extends BaseLLM {
  private client: ChatOpenAI;

  constructor(config: LLMModelConfig) {
    super(config);
    this.client = new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      streaming: config.streaming,
      openAIApiKey: config.apiKey,
      configuration: {
        baseURL: config.baseUrl
      }
    });
  }

  /**
   * Method to send messages to the OpenAI model and receive a response
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const functionCallOptions = this.prepareFunctionCallOptions(options?.functions);
    
    // Create client with dynamic options
    const clientOptions = {
      modelName: this.config.modelName,
      temperature: this.config.temperature,
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
      topP: this.config.topP,
      frequencyPenalty: this.config.frequencyPenalty,
      presencePenalty: this.config.presencePenalty,
      streaming: this.config.streaming,
      openAIApiKey: this.config.apiKey,
      configuration: {
        baseURL: this.config.baseUrl
      }
    };
    
    const dynamicClient = new ChatOpenAI(clientOptions);
    const response = await dynamicClient.invoke(langChainMessages, functionCallOptions);
    
    // Calculate token usage (estimate)
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
      provider: "openai"
    };
  }

  /**
   * Method to send streaming requests to the OpenAI model
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
      openAIApiKey: this.config.apiKey,
      configuration: {
        baseURL: this.config.baseUrl
      }
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
      
      // Calculate token usage after streaming is complete (estimate)
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
        provider: "openai"
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
    // Simple estimation: approximately 3 tokens per 4 characters for English text
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
} 