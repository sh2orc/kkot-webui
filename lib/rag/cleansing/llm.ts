// LLM-based data cleanser

import { BaseDataCleanser } from './base';
import { CleansingOptions, LLMCleansingConfig, CleansingError } from './types';

export class LLMDataCleanser extends BaseDataCleanser {
  private config: LLMCleansingConfig;
  private defaultPrompt = `You are a text cleaning assistant. Your task is to clean and improve the following text while preserving its meaning and important information.

Instructions:
1. Fix any formatting issues
2. Correct obvious spelling and grammar errors
3. Remove redundant information
4. Ensure proper paragraph structure
5. Maintain the original meaning and facts
6. Remove any metadata, headers, footers that don't contribute to the content
7. Keep technical terms and domain-specific language intact

Return only the cleaned text without any explanations or metadata.

Text to clean:
{text}`;

  constructor(config: LLMCleansingConfig) {
    super();
    this.config = config;
  }

  async cleanse(text: string, options?: CleansingOptions): Promise<string> {
    // First apply basic cleaning
    let cleanedText = await super.cleanse(text, options);

    // Then apply LLM cleaning if model is available
    if (this.config.modelId && cleanedText.trim()) {
      try {
        cleanedText = await this.llmCleanse(cleanedText, options);
      } catch (error) {
        console.error('LLM cleansing failed, falling back to basic cleansing:', error);
        // Continue with basic cleaned text
      }
    }

    return cleanedText;
  }

  async cleanseChunks(chunks: string[], options?: CleansingOptions): Promise<string[]> {
    const cleanedChunks: string[] = [];
    const batchSize = 5; // Process chunks in batches to optimize LLM calls

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const cleanedBatch = await Promise.all(
        batch.map(chunk => this.cleanse(chunk, options))
      );
      cleanedChunks.push(...cleanedBatch);
    }

    return cleanedChunks;
  }

  private async llmCleanse(text: string, options?: CleansingOptions): Promise<string> {
    const prompt = this.buildPrompt(text, options);

    try {
      // This would integrate with your existing LLM infrastructure
      const response = await this.callLLM(prompt);
      return response.trim();
    } catch (error) {
      throw new CleansingError(
        `LLM cleansing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LLM_CLEANSING_ERROR'
      );
    }
  }

  private buildPrompt(text: string, options?: CleansingOptions): string {
    let prompt = options?.cleansingPrompt || this.config.basePrompt || this.defaultPrompt;
    
    // Add specific instructions based on options
    const additionalInstructions: string[] = [];

    if (options?.removeUrls) {
      additionalInstructions.push('Remove all URLs');
    }

    if (options?.removeEmails) {
      additionalInstructions.push('Remove all email addresses');
    }

    if (additionalInstructions.length > 0) {
      prompt = prompt.replace(
        'Return only the cleaned text',
        `Additional requirements:\n${additionalInstructions.map(i => `- ${i}`).join('\n')}\n\nReturn only the cleaned text`
      );
    }

    return prompt.replace('{text}', text);
  }

  private async callLLM(prompt: string): Promise<string> {
    // This is a placeholder for actual LLM integration
    // In real implementation, this would call your LLM service
    
    // For now, we'll simulate an API call
    const apiUrl = process.env.LLM_API_URL || 'http://localhost:8000/v1/completions';
    const apiKey = process.env.LLM_API_KEY;

    if (!apiKey) {
      throw new CleansingError('LLM API key not configured', 'MISSING_API_KEY');
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.modelId,
          prompt: prompt,
          temperature: this.config.temperature || 0.3,
          max_tokens: this.config.maxTokens || 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].text || data.choices[0].message.content;
    } catch (error) {
      throw new CleansingError(
        `Failed to call LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LLM_API_ERROR'
      );
    }
  }
}
