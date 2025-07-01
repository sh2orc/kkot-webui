import { BaseMessage, ChatMessage } from "@langchain/core/messages";

// LLM provider type
export type LLMProvider = "openai" | "vllm" | "gemini" | "ollama";

// LLM model configuration interface
export interface LLMModelConfig {
  provider: LLMProvider;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  streaming?: boolean;
  apiKey?: string;
  baseUrl?: string;
}

// LLM message type
export type LLMMessage = {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
};

// LLM response type
export interface LLMResponse {
  content: string;
  tokens: {
    completion: number;
    prompt: number;
    total: number;
  };
  modelName: string;
  provider: LLMProvider;
  finishReason?: string;
}

// LLM streaming callback type
export type LLMStreamCallbacks = {
  onToken?: (token: string) => void;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
};

// LLM function definition type
export interface LLMFunctionDefinition {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

// LLM function call options
export interface LLMFunctionCallOptions {
  functions: LLMFunctionDefinition[];
  forceFunctionName?: string;
}

// LLM request options
export interface LLMRequestOptions {
  functions?: LLMFunctionCallOptions;
  stream?: boolean;
  streamCallbacks?: LLMStreamCallbacks;
  abortSignal?: AbortSignal;
  maxTokens?: number;
} 