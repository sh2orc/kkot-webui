import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * Gemini LLM Implementation
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
   * Method to send messages to Gemini model and receive responses
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    
    const functionCallOptions = this.prepareFunctionCallOptions(options?.functions);
    
    // Create client with dynamic options
    const dynamicClient = new ChatGoogleGenerativeAI({
      model: this.config.modelName,
      temperature: this.config.temperature,
      maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
      topP: this.config.topP,
      apiKey: this.config.apiKey,
      streaming: this.config.streaming,
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
      provider: "gemini"
    };
  }

  /**
   * Method to send streaming requests to Gemini model
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
      maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
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
   * Prepare function call options
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
   * Estimate token count (simple implementation)
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    // Simple estimation: approximately 3 tokens per 4 words in English
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
} 