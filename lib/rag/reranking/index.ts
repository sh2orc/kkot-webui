// RAG Reranking utilities

import { llmModelRepository, llmServerRepository } from '@/lib/db/repository/llm';
import { ragRerankingStrategyRepository } from '@/lib/db/repository/rag';

export interface RerankingResult {
  id: string;
  score: number;
  text: string;
  metadata?: any;
  originalScore?: number;
  [key: string]: any;
}

export interface RerankingConfig {
  strategyId?: number;
  type: 'model_based' | 'rule_based' | 'hybrid' | 'none';
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
  topK?: number;
  minScore?: number;
  settings?: any;
}

export class RerankingService {
  /**
   * Rerank search results based on the specified strategy
   */
  static async rerank(
    query: string,
    results: RerankingResult[],
    config: RerankingConfig
  ): Promise<RerankingResult[]> {
    // If no reranking or type is 'none', return original results
    if (!config || config.type === 'none') {
      return results;
    }

    // Apply topK if specified
    let filteredResults = results;
    if (config.topK && config.topK < results.length) {
      filteredResults = results.slice(0, config.topK);
    }

    // Apply minScore filter if specified
    if (config.minScore) {
      filteredResults = filteredResults.filter(r => r.score >= config.minScore);
    }

    switch (config.type) {
      case 'model_based':
        return await this.modelBasedReranking(query, filteredResults, config);
      case 'rule_based':
        return this.ruleBasedReranking(query, filteredResults, config);
      case 'hybrid':
        // First apply rule-based, then model-based
        const ruleRanked = this.ruleBasedReranking(query, filteredResults, config);
        return await this.modelBasedReranking(query, ruleRanked, config);
      default:
        return filteredResults;
    }
  }

  /**
   * Model-based reranking using a cross-encoder or similar model
   */
  private static async modelBasedReranking(
    query: string,
    results: RerankingResult[],
    config: RerankingConfig
  ): Promise<RerankingResult[]> {
    if (!config.modelId || !config.apiKey) {
      console.warn('Model-based reranking requires modelId and apiKey');
      return results;
    }

    try {
      // For now, we'll use a simple approach where we send the query and documents
      // to an LLM and ask it to rerank them. In the future, this could use
      // specialized reranking models like cross-encoders.
      
      // Prepare documents for reranking
      const documents = results.map((r, idx) => ({
        index: idx,
        text: r.text.substring(0, 1000), // Limit text length
        originalScore: r.score
      }));

      // Create a prompt for reranking
      const prompt = `Given the following query and documents, rerank the documents by relevance to the query.
Return only a JSON array of document indices ordered by relevance (most relevant first).

Query: "${query}"

Documents:
${documents.map(d => `[${d.index}] ${d.text}`).join('\n\n')}

Return format: [index1, index2, index3, ...]`;

      // Call the LLM
      const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: [
            {
              role: 'system',
              content: 'You are a search result reranking assistant. Analyze the query and documents, then return a JSON array of document indices ordered by relevance.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        console.error('Reranking model API call failed:', response.status);
        return results;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('No content in reranking response');
        return results;
      }

      // Parse the reranked indices
      let rerankedIndices: number[];
      try {
        const parsed = JSON.parse(content);
        rerankedIndices = Array.isArray(parsed) ? parsed : parsed.indices || [];
      } catch (e) {
        console.error('Failed to parse reranking response:', e);
        return results;
      }

      // Reorder results based on the model's ranking
      const rerankedResults: RerankingResult[] = [];
      for (const idx of rerankedIndices) {
        if (idx >= 0 && idx < results.length) {
          rerankedResults.push({
            ...results[idx],
            originalScore: results[idx].score,
            score: 1.0 - (rerankedResults.length / results.length) // New score based on rank
          });
        }
      }

      // Add any missing results at the end
      for (let i = 0; i < results.length; i++) {
        if (!rerankedIndices.includes(i)) {
          rerankedResults.push({
            ...results[i],
            originalScore: results[i].score,
            score: 0
          });
        }
      }

      return rerankedResults.slice(0, config.topK || results.length);
    } catch (error) {
      console.error('Model-based reranking failed:', error);
      return results;
    }
  }

  /**
   * Rule-based reranking using heuristics
   */
  private static ruleBasedReranking(
    query: string,
    results: RerankingResult[],
    config: RerankingConfig
  ): RerankingResult[] {
    // Simple rule-based reranking based on:
    // 1. Exact query match
    // 2. Query term frequency
    // 3. Query term proximity
    
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
    
    const scoredResults = results.map(result => {
      const textLower = result.text.toLowerCase();
      let bonusScore = 0;
      
      // Exact match bonus
      if (textLower.includes(queryLower)) {
        bonusScore += 0.5;
      }
      
      // Term frequency bonus
      const termFrequency = queryTerms.reduce((count, term) => {
        const matches = (textLower.match(new RegExp(term, 'g')) || []).length;
        return count + matches;
      }, 0);
      bonusScore += Math.min(termFrequency * 0.1, 0.3);
      
      // Combine original score with bonus
      return {
        ...result,
        originalScore: result.score,
        score: result.score * (1 + bonusScore)
      };
    });
    
    // Sort by new score
    scoredResults.sort((a, b) => b.score - a.score);
    
    return scoredResults;
  }

  /**
   * Get reranking configuration from strategy ID
   */
  static async getRerankingConfig(strategyId?: number): Promise<RerankingConfig | null> {
    if (!strategyId) return null;

    const strategy = await ragRerankingStrategyRepository.findByIdWithModel(strategyId);
    if (!strategy || strategy.type === 'none') return null;

    let config: RerankingConfig = {
      strategyId: strategy.id,
      type: strategy.type as any,
      topK: strategy.topK,
      minScore: strategy.minScore ? parseFloat(strategy.minScore) : undefined,
      settings: strategy.settings ? JSON.parse(strategy.settings) : undefined
    };

    // If model-based, get model details
    if (strategy.type === 'model_based' && strategy.rerankingModelId) {
      const models = await llmModelRepository.findAllWithServer();
      const model = models.find((m: any) => m.id === strategy.rerankingModelId);
      
      if (model && model.serverId) {
        const servers = await llmServerRepository.findById(model.serverId);
        const server = servers?.[0];
        
        if (server && server.apiKey) {
          config.modelId = model.modelId;
          config.apiKey = server.apiKey;
          config.baseUrl = server.baseUrl || 'https://api.openai.com';
        }
      }
    }

    return config;
  }
}
