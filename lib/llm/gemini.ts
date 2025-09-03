import { GoogleGenAI } from "@google/genai";
import { BaseLLM } from "./base";
import { LLMFunctionCallOptions, LLMMessage, LLMModelConfig, LLMRequestOptions, LLMResponse, LLMStreamCallbacks } from "./types";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Gemini LLM Implementation using official Google GenAI SDK
 * Supports multimodal (text + images) and image generation
 */
export class GeminiLLM extends BaseLLM {
  private client: GoogleGenAI;

  constructor(config: LLMModelConfig) {
    super(config);
    this.client = new GoogleGenAI({
      apiKey: config.apiKey
    });
  }

  /**
   * Method to send messages to Gemini model and receive responses
   * Supports multimodal (text + images)
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    try {
      // Convert LLMMessage format to Google GenAI format
      const contents = this.convertToGoogleGenAIFormat(messages);
      
      // Build request parameters (without thinking config to avoid errors)
      const requestParams: any = {
        model: this.config.modelName,
        contents: contents,
        config: {
          temperature: this.config.temperature,
          maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
          topP: this.config.topP
        }
      };

      // Add tools if provided
      const tools = this.prepareFunctionCallOptions(options?.functions);
      if (tools.length > 0) {
        requestParams.tools = tools;
      }

      const response = await this.client.models.generateContent(requestParams);

      // Calculate token usage (estimated)
      const promptTokens = this.estimateTokenCount(messages);
      const responseText = response.text || '';
      const completionTokens = this.estimateTokenCount([{ role: "assistant", content: responseText }]);

      return {
        content: responseText,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens
        },
        modelName: this.config.modelName,
        provider: "gemini"
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Method to send streaming requests to Gemini model
   * Supports multimodal (text + images)
   */
  async streamChat(
    messages: LLMMessage[],
    callbacks: LLMStreamCallbacks,
    options?: LLMRequestOptions
  ): Promise<void> {
    try {
      // Convert LLMMessage format to Google GenAI format
      const contents = this.convertToGoogleGenAIFormat(messages);
      
      // Build request parameters (without thinking config to avoid errors)
      const requestParams: any = {
        model: this.config.modelName,
        contents: contents,
        config: {
          temperature: this.config.temperature,
          maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
          topP: this.config.topP
        }
      };

      // Add tools if provided
      const tools = this.prepareFunctionCallOptions(options?.functions);
      if (tools.length > 0) {
        requestParams.tools = tools;
      }

      const stream = await this.client.models.generateContentStream(requestParams);

      let fullContent = "";

      for await (const chunk of stream) {
        if (chunk.text) {
          const contentStr = chunk.text;
          fullContent += contentStr;
          if (callbacks.onToken) {
            callbacks.onToken(contentStr);
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
      console.error('Gemini streaming error:', error);
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Convert LLMMessage format to Google GenAI format with multimodal support
   */
  private convertToGoogleGenAIFormat(messages: LLMMessage[]): any[] {
    return messages.map(message => {
      const role = message.role === 'assistant' ? 'model' : message.role;
      
      // Handle multimodal content (text + images)
      if (typeof message.content === 'object' && message.content !== null) {
        // Multimodal message with images
        const parts: any[] = [];
        const content = message.content as any;
        
        // Add text part if exists
        if (content.text) {
          parts.push({ text: content.text });
        }
        
        // Add image parts
        if (content.images && Array.isArray(content.images)) {
          content.images.forEach((image: any) => {
            if (image.data && typeof image.data === 'string') {
              // Extract base64 data (remove data:image/xxx;base64, prefix)
              const base64Data = image.data.includes(',') ? image.data.split(',')[1] : image.data;
              const mimeType = image.mimeType || this.extractMimeTypeFromDataUrl(image.data) || 'image/jpeg';
              
              parts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              });
            }
          });
        }
        
        return { role, parts };
      } else {
        // Simple text message
        return {
          role,
          parts: [{ text: message.content.toString() }]
        };
      }
    });
  }

  /**
   * Extract MIME type from data URL
   */
  private extractMimeTypeFromDataUrl(dataUrl: string): string | null {
    if (!dataUrl.startsWith('data:')) return null;
    const match = dataUrl.match(/^data:([^;]+);/);
    return match ? match[1] : null;
  }

  /**
   * Prepare function call options for Google GenAI SDK
   */
  private prepareFunctionCallOptions(functionOptions?: LLMFunctionCallOptions): any[] {
    if (!functionOptions) return [];
    
    return functionOptions.functions.map(fn => ({
      functionDeclarations: [
        {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }
      ]
    }));
  }

  /**
   * Generate images using Gemini image generation models
   * Based on official Google Gemini API documentation
   * https://ai.google.dev/gemini-api/docs/image-generation
   */
  async generateImage(prompt: string, options?: {
    model?: string;
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
    negativePrompt?: string;
    inputImages?: Array<{ data: string; mimeType: string }>; // For image editing
  }): Promise<LLMResponse> {
    try {
      // Use Gemini native image generation model
      // Try different model names as the preview model might not support image generation
      const imageModel = options?.model || 'gemini-2.5-flash-image-preview';
      

      
      // Prepare contents for API call based on official documentation
      let contents: any;
      
      if (options?.inputImages && options.inputImages.length > 0) {
        // Image editing mode: combine images + text
        // Following the official documentation pattern for image editing

        
        // Create an array with image parts followed by text
        const parts = [];
        
        // Add all input images as inline data
        for (const img of options.inputImages) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          });
        }
        
        // Add the text prompt with explicit image generation request
        parts.push({
          text: prompt
        });
        
        // For image generation, contents should be the parts array directly (no role wrapper)
        contents = parts;
        

      } else {
        // Image generation mode: text only

        
        // Simple text prompt for image generation with explicit request
        contents = [{
          text: prompt
        }];
        

      }
      
      // Call the API using the correct method
      console.log('🚀 Gemini image generation request - Model:', imageModel, 'Images:', options?.inputImages?.length || 0);
      
      const response = await this.client.models.generateContent({
        model: imageModel,
        contents: contents
      });

      // Get the response result
      console.log('🔍 Gemini response - candidates:', response?.candidates?.length || 0);
      
      // Only log full response if there's an error
      if (!response?.candidates || response.candidates.length === 0) {
        console.log('🚨 No candidates in response:', JSON.stringify(response, null, 2));
      }

      // Extract image from response following official documentation pattern
      let imageBase64 = '';
      let textContent = '';
      
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];

        
        if (candidate.content && candidate.content.parts) {

          
          // Process each part in the response
          for (let i = 0; i < candidate.content.parts.length; i++) {
            const part = candidate.content.parts[i];

            
            if (part.text) {
              textContent += part.text;

            }
            
            if (part.inlineData) {
              // Extract image data from inlineData
              const imageData = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || 'image/png';
              
              if (imageData) {
                imageBase64 = imageData;

              } else {

              }
            }
          }
        } else {

        }
      } else {

        throw new Error('No candidates found in Gemini response');
      }

      if (!imageBase64) {

        
        // Return text-only response without any test image
        return {
          content: textContent || "이미지 생성에 failed했습니다.",
          imageUrl: null
        };
      }

      // Detect actual mime type from the response
      let mimeType = 'image/png'; // Default mime type
      
      // Check if we can detect the mime type from the response
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.mimeType) {
            mimeType = part.inlineData.mimeType;

            break;
          }
        }
      }
      
      // Save large image to file instead of using base64 data URL

      
      // Create unique filename
      const imageId = crypto.randomUUID();
      const fileExtension = mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `generated-${imageId}.${fileExtension}`;
      const publicDir = path.join(process.cwd(), 'public', 'temp-images');
      const filePath = path.join(publicDir, fileName);
      
      // Ensure directory exists
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });

      }
      
      // Save image to file
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(filePath, imageBuffer);
      
      // Ensure file is written and accessible
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create public URL using API endpoint for better reliability
      const imageUrl = `/api/images/${fileName}`;
      

      
      // Create comprehensive response with both text and image
      let markdownContent = '';
      
      // Add text description if available
      if (textContent && textContent.trim()) {
        markdownContent += textContent.trim() + '\n\n';

      }
      
      // Add the image directly without default text
      markdownContent += `![Generated Image](${imageUrl})`;
      
      // Test if markdown contains image tag
      const hasImageTag = markdownContent.includes('![Generated Image]');

      return {
        content: markdownContent,
        tokens: {
          prompt: this.estimateTokenCount([{ role: 'user', content: prompt }]),
          completion: 1290, // As per documentation: images are tokenized at 1,290 tokens per image
          total: this.estimateTokenCount([{ role: 'user', content: prompt }]) + 1290
        },
        modelName: imageModel,
        provider: "gemini"
      };
    } catch (error) {
      console.error('Gemini image generation error:', error);
      throw error;
    }
  }

  /**
   * Estimate token count (simple implementation)
   */
  private estimateTokenCount(messages: LLMMessage[]): number {
    // Simple estimation: approximately 3 tokens per 4 words in English
    const totalChars = messages.reduce((sum, msg) => {
      if (typeof msg.content === 'string') {
        return sum + msg.content.length;
      } else if (typeof msg.content === 'object' && msg.content !== null) {
        const content = msg.content as any;
        if (content.text) {
          return sum + content.text.length;
        }
      }
      return sum;
    }, 0);
    return Math.ceil(totalChars / 4);
  }
} 