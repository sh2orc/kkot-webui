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
   */
  async generateImage(prompt: string, options?: {
    model?: string;
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
    negativePrompt?: string;
    inputImages?: Array<{ data: string; mimeType: string }>; // For image editing
  }): Promise<LLMResponse> {
    try {
      // Use Gemini native image generation model
      const imageModel = options?.model || 'gemini-2.5-flash-image-preview';
      
      console.log('🎨 Generating image with model:', imageModel);
      console.log('🎨 Original prompt:', prompt);
      console.log('🎨 Input images:', options?.inputImages ? options.inputImages.length : 0);
      
      // Prepare contents for API call
      let contents: any;
      
      if (options?.inputImages && options.inputImages.length > 0) {
        // Image editing mode: combine text + images
        console.log('🎨 Image editing mode: combining text with input images');
        
        contents = [
          // Add input images first
          ...options.inputImages.map(img => ({
            inlineData: {
              data: img.data,
              mimeType: img.mimeType
            }
          })),
          // Add text prompt
          prompt
        ];
        
        console.log('🎨 Multimodal contents prepared:', {
          imageCount: options.inputImages.length,
          textPrompt: prompt
        });
      } else {
        // Image generation mode: text only
        console.log('🎨 Image generation mode: text-to-image');
        const optimizedPrompt = `Create a detailed image: ${prompt}`;
        console.log('🎨 Optimized prompt:', optimizedPrompt);
        contents = optimizedPrompt;
      }
      
      // Following the exact pattern from the official documentation
      const response = await this.client.models.generateContent({
        model: imageModel,
        contents: contents,
      });

      console.log('🎨 Raw response:', JSON.stringify(response, null, 2));
      console.log('🎨 Candidates:', response.candidates);

      // Extract image from response (following official documentation)
      let imageBase64 = '';
      let textContent = '';
      
      console.log('🎨 Response structure check:');
      console.log('🎨 Has candidates:', !!response.candidates);
      console.log('🎨 Candidates length:', response.candidates?.length || 0);
      
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        console.log('🎨 Candidate keys:', Object.keys(candidate));
        console.log('🎨 Has content:', !!candidate.content);
        console.log('🎨 Content keys:', candidate.content ? Object.keys(candidate.content) : 'none');
        
        if (candidate.content && candidate.content.parts) {
          console.log('🎨 Parts length:', candidate.content.parts.length);
          
          // Following the exact pattern from the documentation
          for (const part of candidate.content.parts) {
            console.log('🎨 Part keys:', Object.keys(part));
            
            if (part.text) {
              textContent += part.text;
              console.log('🎨 ✅ Text part found:');
              console.log('🎨 📝 Full text content:', part.text);
            } else if (part.inlineData) {
              // This is the exact property name from the documentation
              const imageData = part.inlineData.data;
              if (imageData) {
                imageBase64 = imageData;
                console.log('🎨 ✅ Image data found! Size:', imageData.length, 'characters');
                console.log('🎨 ✅ MIME type:', part.inlineData.mimeType || 'unknown');
              } else {
                console.log('🎨 ❌ InlineData exists but no data property');
              }
            } else {
              console.log('🎨 ⚠️  Unknown part type. Available keys:', Object.keys(part));
            }
          }
        } else {
          console.log('🎨 ❌ No content.parts found in candidate');
        }
      } else {
        console.log('🎨 ❌ No candidates found in response');
      }

      if (!imageBase64) {
        console.log('🎨 ❌ No image data found, using test image instead');
        // Use a small test image (1x1 red pixel) for debugging
        imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        console.log('🎨 🧪 Using test image data');
      }

      // Detect actual mime type from the response
      let mimeType = 'image/png'; // Default mime type
      
      // Check if we can detect the mime type from the response
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.mimeType) {
            mimeType = part.inlineData.mimeType;
            console.log('🎨 ✅ Detected MIME type:', mimeType);
            break;
          }
        }
      }
      
      // Save large image to file instead of using base64 data URL
      console.log('🎨 💾 Saving image to file (base64 too large for browser)');
      
      // Create unique filename
      const imageId = crypto.randomUUID();
      const fileExtension = mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `generated-${imageId}.${fileExtension}`;
      const publicDir = path.join(process.cwd(), 'public', 'temp-images');
      const filePath = path.join(publicDir, fileName);
      
      // Ensure directory exists
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log('🎨 📁 Created temp-images directory');
      }
      
      // Save image to file
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(filePath, imageBuffer);
      
      // Ensure file is written and accessible
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create public URL using API endpoint for better reliability
      const imageUrl = `/api/images/${fileName}`;
      
      console.log('🎨 💾 Image saved successfully:');
      console.log('🎨 📂 File path:', filePath);
      console.log('🎨 🌐 API URL:', imageUrl);
      console.log('🎨 📏 File size:', imageBuffer.length, 'bytes');
      console.log('🎨 📋 MIME type:', mimeType);
      
      // Create comprehensive response with both text and image
      let markdownContent = '';
      
      // Add text description if available
      if (textContent && textContent.trim()) {
        markdownContent += textContent.trim() + '\n\n';
        console.log('🎨 📝 ✅ Text description included:', textContent.trim());
      } else {
        // Add default description if no text provided
        markdownContent += '🎨 **생성된 이미지**\n\n';
        console.log('🎨 📝 ℹ️ No text from Gemini, using default description');
      }
      
      // Add the image
      markdownContent += `![Generated Image](${imageUrl})`;
      
      console.log('🎨 📝 Final markdown with file URL:');
      console.log('🎨 📝 Text portion length:', textContent ? textContent.length : 0);
      console.log('🎨 📝 Image URL:', imageUrl);
      console.log('🎨 📝 Complete markdown:');
      console.log(markdownContent);
      
      // Test if markdown contains image tag
      const hasImageTag = markdownContent.includes('![Generated Image]');
      console.log('🎨 📝 Contains image tag:', hasImageTag);

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