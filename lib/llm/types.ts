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
  supportsMultimodal?: boolean;
}

// Image content type for multimodal messages
export interface ImageContent {
  type: "image";
  image_url: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

// Text content type for multimodal messages
export interface TextContent {
  type: "text";
  text: string;
}

// Content type for multimodal messages
export type MessageContent = string | (TextContent | ImageContent)[];

// LLM message type with multimodal support
export type LLMMessage = {
  role: "system" | "user" | "assistant" | "function";
  content: MessageContent;
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
  supportsMultimodal?: boolean;
}

// Helper function to create image content
export const createImageContent = (url: string, detail?: "low" | "high" | "auto"): ImageContent => ({
  type: "image",
  image_url: { url, detail }
});

// Helper function to create text content
export const createTextContent = (text: string): TextContent => ({
  type: "text",
  text
});

// Helper function to check if message is multimodal
export const isMultimodalMessage = (message: LLMMessage): boolean => {
  return Array.isArray(message.content);
};

// Helper function to extract text from multimodal content
export const extractTextFromContent = (content: MessageContent): string => {
  if (typeof content === "string") {
    return content;
  }
  
  return content
    .filter((item): item is TextContent => item.type === "text")
    .map(item => item.text)
    .join("");
}; 