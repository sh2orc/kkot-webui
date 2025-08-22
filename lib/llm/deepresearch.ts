import { BaseLLM } from "./base";
import { LLMMessage, LLMResponse } from "./types";

export interface DeepResearchStep {
  id: string;
  title: string;
  question: string;
  analysis: string;
  sources?: string[];
  confidence: number;
}

export interface DeepResearchResult {
  query: string;
  steps: DeepResearchStep[];
  synthesis: string;
  finalAnswer: string;
  confidence: number;
  methodology: string;
}

export interface DeepResearchConfig {
  maxSteps: number;
  confidenceThreshold: number;
  analysisDepth: 'basic' | 'intermediate' | 'advanced';
  includeSourceCitations: boolean;
  language: 'ko' | 'en';
}

export class DeepResearchProcessor {
  private llm: BaseLLM;
  private config: DeepResearchConfig;

  constructor(llm: BaseLLM, config: Partial<DeepResearchConfig> = {}) {
    this.llm = llm;
    this.config = {
      maxSteps: 5,
      confidenceThreshold: 0.8,
      analysisDepth: 'intermediate',
      includeSourceCitations: false,
      language: 'ko',
      ...config
    };
  }

  /**
   * Perform deep research - enhanced structure
   */
  async performDeepResearch(
    query: string,
    context: string = "",
    onProgress?: (step: DeepResearchStep) => void,
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void,
    abortSignal?: AbortSignal
  ): Promise<DeepResearchResult> {
    try {
      console.log('=== Deep Research Started ===');
      console.log('Query:', query);
      
      // Check if operation was aborted before starting
      if (abortSignal?.aborted) {
        throw new Error('Deep research was aborted');
      }
      
      // Step 1: Generate sub-questions and display immediately
      console.log('1. Generating and displaying sub-questions...');
      const subQuestions = await this.generateSubQuestions(query, context, abortSignal);
      console.log('Sub-questions generated:', subQuestions);
      
      // Check if operation was aborted after sub-questions
      if (abortSignal?.aborted) {
        throw new Error('Deep research was aborted');
      }
      
      // Pass planned steps in advance (display sub-questions first)
      const plannedSteps = [
        { title: 'Sub-questions Generated', type: 'step' },
        { title: 'Question Analysis', type: 'step' },
        ...subQuestions.map(q => ({ title: `Analysis: ${q}`, type: 'step' })),
        { title: 'Synthesis Analysis', type: 'synthesis' },
        { title: 'Final Answer', type: 'final' }
      ];

      console.log('2. Sending planned steps:', plannedSteps);
      if (onStream) {
        onStream('Deep research plan has been established.', 'step', { 
          title: 'Analysis Planning', 
          isComplete: true,
          totalSteps: plannedSteps.length,
          plannedSteps: plannedSteps
        } as any);
      }

      // Step 1.5: Display sub-questions immediately
      console.log('1.5. Displaying sub-questions immediately...');
      if (onStream) {
        const subQuestionsContent = `## [Analysis Start] Sub-questions Generated

### 🎯 Generated Sub-questions
The following detailed questions will be analyzed:

${subQuestions.map((q, i) => `**${i + 1}. ${q}**`).join('\n\n')}

### 📋 Analysis Plan
Systematic analysis will be conducted for each question.

### 🔍 Analysis Methodology
- Perform in-depth analysis for each sub-question
- Approach from various perspectives
- Review connections with previous analysis results
- Draw comprehensive conclusions`;
        
        onStream(subQuestionsContent, 'step', { 
          title: 'Sub-questions Generated', 
          isComplete: true
        });
      }

      // Step 2: Initial question analysis
      console.log('3. Starting initial query analysis...');
      const analysisStep = await this.analyzeQuery(query, context, onStream, abortSignal);
      console.log('Initial analysis completed:', analysisStep.title);

      // Check if operation was aborted after initial analysis
      if (abortSignal?.aborted) {
        throw new Error('Deep research was aborted');
      }

      // Step 3: Analyze each sub-question (map to individual components)
      const steps = [analysisStep];
      
      console.log('4. Starting sub-question analysis...');
      for (let i = 0; i < Math.min(subQuestions.length, this.config.maxSteps - 1); i++) {
        // Check if operation was aborted before each sub-question
        if (abortSignal?.aborted) {
          throw new Error('Deep research was aborted');
        }
        
        const subQuestion = subQuestions[i];
        const plannedTitle = `Analysis: ${subQuestion}`;
        console.log(`4.${i+1}. Analyzing sub-question: ${plannedTitle}`);
        const step = await this.analyzeSubQuestion(subQuestion, context, steps, onStream, plannedTitle, abortSignal);
        steps.push(step);
        console.log(`4.${i+1}. Sub-question analysis completed`);
      }

      // Check if operation was aborted after sub-question analysis
      if (abortSignal?.aborted) {
        throw new Error('Deep research was aborted');
      }

      // Step 4: Synthesis analysis
      console.log('5. Starting synthesis...');
      const synthesis = await this.synthesizeFindings(query, steps, onStream, abortSignal);
      console.log('Synthesis completed');
      
      // Check if operation was aborted after synthesis
      if (abortSignal?.aborted) {
        throw new Error('Deep research was aborted');
      }
      
      // Step 5: Generate final answer
      console.log('6. Generating final answer...');
      const finalAnswer = await this.generateFinalAnswer(query, steps, synthesis, onStream, abortSignal);
      console.log('Final answer generated');

      console.log('=== Deep Research Completed ===');
      return {
        query,
        steps,
        synthesis,
        finalAnswer,
        confidence: this.calculateOverallConfidence(steps),
        methodology: this.generateMethodologyDescription()
      };

    } catch (error) {
      console.error('Deep research error:', error);
      throw new Error(`Error occurred during deep research: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Step-by-step deep research - Step 1: Generate sub-questions
   */
  async generateSubQuestionsStep(
    query: string,
    context: string = ""
  ): Promise<{ subQuestions: string[], plannedSteps: Array<{ title: string, type: string }> }> {
    console.log('=== Step 1: Generating Sub-questions ===');
    
    const subQuestions = await this.generateSubQuestions(query, context);
    console.log('Sub-questions generated:', subQuestions);
    
    const plannedSteps = [
      { title: 'Sub-questions Generated', type: 'step' },
      { title: 'Question Analysis', type: 'step' },
      ...subQuestions.map(q => ({ title: `Analysis: ${q}`, type: 'step' })),
      { title: 'Synthesis Analysis', type: 'synthesis' },
      { title: 'Final Answer', type: 'final' }
    ];

    return { subQuestions, plannedSteps };
  }

  /**
   * Step-by-step deep research - Step 2: Initial question analysis
   */
  async analyzeQueryStep(
    query: string,
    context: string = "",
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void
  ): Promise<DeepResearchStep> {
    console.log('=== Step 2: Analyzing Query ===');
    return await this.analyzeQuery(query, context, onStream);
  }

  /**
   * Step-by-step deep research - Step 3: Individual sub-question analysis
   */
  async analyzeSubQuestionStep(
    subQuestion: string,
    query: string,
    context: string = "",
    previousSteps: DeepResearchStep[] = [],
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void
  ): Promise<DeepResearchStep> {
    console.log('=== Step 3: Analyzing Sub-question ===');
    const plannedTitle = `Analysis: ${subQuestion}`;
    return await this.analyzeSubQuestion(subQuestion, context, previousSteps, onStream, plannedTitle);
  }

  /**
   * Step-by-step deep research - Step 4: Synthesis analysis
   */
  async synthesizeStep(
    query: string,
    steps: DeepResearchStep[],
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void
  ): Promise<string> {
    console.log('=== Step 4: Synthesizing Findings ===');
    return await this.synthesizeFindings(query, steps, onStream);
  }

  /**
   * Step-by-step deep research - Step 5: Generate final answer
   */
  async generateFinalAnswerStep(
    query: string,
    steps: DeepResearchStep[],
    synthesis: string,
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void
  ): Promise<string> {
    console.log('=== Step 5: Generating Final Answer ===');
    return await this.generateFinalAnswer(query, steps, synthesis, onStream);
  }

  /**
   * Initial question analysis
   */
  private async analyzeQuery(query: string, context: string, onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void, abortSignal?: AbortSignal): Promise<DeepResearchStep> {
    console.log('analyzeQuery started');
    
    const prompt = `Please analyze the following question systematically. Detect the language of the input and respond in the same language. Do not use markdown formatting or emojis in your response.

Question: "${query}"
${context ? `Context: ${context}` : ''}

Please analyze using the following structure without markdown headers:

[Analysis Start] Question Analysis

Core Concept Definition:
- Define the core keywords and concepts of the question

Question Intent Analysis:
- Explain what the questioner wants to know fundamentally

Analysis Perspective Setting:
- List the various perspectives needed to solve this question

Expected Analysis Direction:
- Predict what aspects need to be explored through this analysis

Please analyze thoroughly and systematically without using markdown or emoji formatting.`;

    // Send streaming progress (status only)
    if (onStream) {
      onStream('', 'step', { title: 'Question Analysis', isComplete: false });
    }

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // Check if operation was aborted before LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }

    const response = await this.llm.chat(messages);
    
    // Check if operation was aborted after LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }
    
    const analysisResult: DeepResearchStep = {
      id: 'analysis-query',
      title: 'Question Analysis',
      question: query,
      analysis: response.content,
      confidence: 0.8
    };

    // Send streaming content on completion
    if (onStream) {
      onStream(response.content, 'step', { title: 'Question Analysis', isComplete: true });
    }

    console.log('analyzeQuery completed');
    return analysisResult;
  }

  /**
   * Generate sub-questions
   */
  private async generateSubQuestions(query: string, context: string, abortSignal?: AbortSignal): Promise<string[]> {
    const trimmedQuery = query.trim();
    
    // Create more specific prompt based on query content
    let prompt = `Generate specific and focused sub-questions for in-depth analysis of the given question. The input language is Korean, so generate sub-questions in Korean.

Original Question: "${trimmedQuery}"
${context ? `Context: ${context}` : ''}

For a comprehensive analysis of "${trimmedQuery}", please generate 3-4 specific sub-questions that explore different aspects:

Guidelines:
1. Each sub-question should explore a different dimension or aspect
2. Make them specific enough for detailed analysis
3. Ensure they collectively provide comprehensive coverage
4. Use Korean language for Korean queries
5. Avoid overly broad or vague questions

Examples for "한국에 대해":
- 한국의 역사적 발전 과정에서 중요한 전환점은 무엇인가요?
- 한국의 문화적 정체성은 어떻게 형성되었으며 현대에 어떻게 나타나고 있나요?
- 한국의 경제 발전 모델의 특징과 성과는 무엇인가요?
- 한국의 정치 체계와 사회 구조의 특징은 무엇인가요?

Now generate 3-4 sub-questions for the given query (Korean queries should be answered in Korean):`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    try {
      // Check if operation was aborted before LLM call
      if (abortSignal?.aborted) {
        throw new Error('Deep research was aborted');
      }
      
      const response = await this.llm.chat(messages);
      
      // Check if operation was aborted after LLM call
      if (abortSignal?.aborted) {
        throw new Error('Deep research was aborted');
      }
      
      // Parse sub-questions (one per line)
      let subQuestions = response.content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+\./) && !line.match(/^[•\-\*]/))
        .filter(line => line.length > 10) // Filter out very short lines
        .slice(0, this.config.maxSteps - 1); // Reserve one slot for synthesis

      console.log('Parsed sub-questions from LLM:', subQuestions);
      
      // Fallback logic for empty or insufficient sub-questions
      if (subQuestions.length === 0) {
        console.log('No sub-questions generated, creating fallback questions');
        subQuestions = this.createFallbackSubQuestions(trimmedQuery);
      } else if (subQuestions.length < 2) {
        console.log('Insufficient sub-questions generated, adding fallback questions');
        const fallbackQuestions = this.createFallbackSubQuestions(trimmedQuery);
        subQuestions = [...subQuestions, ...fallbackQuestions].slice(0, 4);
      }

      console.log('Final sub-questions:', subQuestions);
      return subQuestions;
    } catch (error) {
      console.error('Error generating sub-questions:', error);
      // Return fallback questions on error
      return this.createFallbackSubQuestions(trimmedQuery);
    }
  }

  /**
   * Create fallback sub-questions for common query patterns
   */
  private createFallbackSubQuestions(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    
    // Korean query patterns
    if (query.includes('한국') || query.includes('대한민국')) {
      return [
        'What are the important turning points in Korea\'s historical development process?',
        'How has Korean cultural identity been formed and how is it manifested in modern times?',
        'What are the characteristics and achievements of Korea\'s economic development model?',
        'What are the characteristics of Korea\'s political system and social structure?'
      ];
    }
    
    // English query patterns
    if (lowerQuery.includes('korea')) {
      return [
        'What are the key historical turning points in Korea\'s development?',
        'How has Korean cultural identity been formed and how does it manifest in modern times?',
        'What are the characteristics and achievements of Korea\'s economic development model?',
        'What are the features of Korea\'s political system and social structure?'
      ];
    }
    
    // General fallback questions that can be adapted to any topic
    const topic = query.replace(/에\s*대해/, '').replace(/에\s*관해/, '').replace(/about/i, '').trim();
    
    if (query.includes('대해') || query.includes('관해')) {
      return [
        `What is the historical background and development process of ${topic}?`,
        `What are the main characteristics and features of ${topic}?`,
        `What is the current situation and trends of ${topic}?`,
        `What are the future prospects and challenges of ${topic}?`
      ];
    }
    
    if (lowerQuery.includes('about')) {
      return [
        `What is the historical background and development of ${topic}?`,
        `What are the main characteristics and features of ${topic}?`,
        `What is the current situation and trends regarding ${topic}?`,
        `What are the future prospects and challenges for ${topic}?`
      ];
    }
    
    // Ultimate fallback for any query
    return [
      `What are the basic definitions and concepts of ${query}?`,
      `What are the main characteristics and elements of ${query}?`,
      `What is the current situation related to ${query}?`,
      `What are the various perspectives and views on ${query}?`
    ];
  }

  /**
   * Analyze sub-question
   */
  private async analyzeSubQuestion(
    question: string, 
    context: string, 
    previousSteps: DeepResearchStep[],
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void,
    plannedTitle?: string,
    abortSignal?: AbortSignal
  ): Promise<DeepResearchStep> {
    const stepTitle = plannedTitle || `Analysis: ${question}`;
    console.log(`Analyzing sub-question: ${stepTitle}`);
    
    // Build previous analysis context
    const previousAnalysis = previousSteps.map(step => 
      `${step.title}: ${step.analysis.substring(0, 200)}...`
    ).join('\n\n');

    const prompt = `Analyze the following sub-question deeply and systematically. Detect the language of the input and respond in the same language. Do not use markdown formatting or emojis.

Sub-question: "${question}"
${context ? `Context: ${context}` : ''}

Previous Analysis Results:
${previousAnalysis}

Please provide thorough analysis using the following structure without markdown headers:

[Analysis Start] ${stepTitle}

Core Analysis:
- Direct analysis of the sub-question

Related Factors:
- Important factors and variables to consider

Evidence and Examples:
- Relevant evidence, data, or examples

Connections to Previous Analysis:
- How this relates to previous analysis results

Key Insights:
- Important insights and findings from this analysis

Please analyze thoroughly and systematically without using markdown or emoji formatting.`;

    // Send streaming progress (status only)
    if (onStream) {
      onStream('', 'step', { title: stepTitle, isComplete: false });
    }

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // Check if operation was aborted before LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }

    const response = await this.llm.chat(messages);
    
    // Check if operation was aborted after LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }
    
    const analysisResult: DeepResearchStep = {
      id: `analysis-${Date.now()}`,
      title: stepTitle,
      question: question,
      analysis: response.content,
      confidence: 0.85
    };

    // Send streaming content on completion
    if (onStream) {
      onStream(response.content, 'step', { title: stepTitle, isComplete: true });
    }

    console.log(`Sub-question analysis completed: ${stepTitle}`);
    return analysisResult;
  }

  /**
   * Synthesize findings
   */
  private async synthesizeFindings(query: string, steps: DeepResearchStep[], onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void, abortSignal?: AbortSignal): Promise<string> {
    console.log('synthesizeFindings started');
    
    const analysisResults = steps.map(step => 
      `${step.title}:\n${step.analysis}`
    ).join('\n\n---\n\n');

    const prompt = `Based on the detailed analysis results below, synthesize and integrate the findings. Detect the language of the original question and respond in the same language. Do not use markdown formatting or emojis.

Original Question: "${query}"

Analysis Results:
${analysisResults}

Please provide comprehensive synthesis using the following structure without markdown headers:

[Synthesis Start] Synthesis Analysis

Key Finding Integration:
- Integrate and synthesize the main findings from each analysis

Pattern and Trend Identification:
- Identify common patterns and trends across analyses

Consistency and Contradiction Analysis:
- Note areas of consistency and any contradictions

Gap and Limitation Analysis:
- Identify gaps in analysis and limitations

Comprehensive Perspective:
- Provide an integrated comprehensive perspective

Please synthesize thoroughly without using markdown or emoji formatting.`;

    // Send streaming progress (status only)
    if (onStream) {
      onStream('', 'synthesis', { title: 'Synthesis Analysis', isComplete: false });
    }

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // Check if operation was aborted before LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }

    const response = await this.llm.chat(messages);
    
    // Check if operation was aborted after LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }
    
    // Send streaming content on completion
    if (onStream) {
      onStream(response.content, 'synthesis', { title: 'Synthesis Analysis', isComplete: true });
    }
    
    return response.content;
  }

  /**
   * Generate final answer
   */
  private async generateFinalAnswer(
    query: string, 
    steps: DeepResearchStep[], 
    synthesis: string,
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const prompt = `Original Question: "${query}"

Performed Analyses:
${steps.map(step => `- ${step.title}: ${step.analysis}`).join('\n')}

Synthesis Analysis:
${synthesis}

CRITICAL INSTRUCTION - LANGUAGE DETECTION AND RESPONSE:
Please carefully examine the original question "${query}" and detect its language. You must respond in the EXACT SAME LANGUAGE as the original question. This is absolutely critical.

- If the original question is in Korean, respond entirely in Korean
- If the original question is in English, respond entirely in English  
- If the original question is in Japanese, respond entirely in Japanese
- If the original question is in Chinese, respond entirely in Chinese
- For any other language, respond in that detected language

Based on all the analyses above, please provide a comprehensive and in-depth and detailed final answer to the original question. You may use markdown formatting to structure your response clearly and effectively, but avoid using emojis.

IMPORTANT: When writing the final answer, please follow this format and write ALL content in the same language as the original question:

1. First, freely write any analysis process or additional explanations
2. Below write the final answer with the following structure, but not subtitles (using appropriate language):
   - clear and direct response
   - detail key perspectives and evidence
   - Considerations, limitations, various viewpoints
   - Conclusion, summary and future directions

Format example (adapt section headers to the detected language, and feel free to use markdown for better structure):

[Analysis process or additional explanations in the original question's language]

[Core Answer in original language]

[Detailed Analysis in original language]

[Considerations in original language]

[Conclusion in original language]

Remember: The entire response must be in the same language as the original question "${query}"`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getFinalAnswerSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // Send streaming progress (status only)
    if (onStream) {
      onStream('', 'final', { title: 'Final Answer', isComplete: false });
    }

    // Check if operation was aborted before LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }

    const response = await this.llm.chat(messages);
    
    // Check if operation was aborted after LLM call
    if (abortSignal?.aborted) {
      throw new Error('Deep research was aborted');
    }
    
    // During streaming, send full content and extract markers only in final result
    if (onStream) {
      // Send full content during streaming (without marker extraction)
      onStream(response.content, 'final', { title: 'Final Answer', isComplete: true });
    }
    
    // Extract content after markers only for final return value
    const finalAnswerContent = this.extractFinalAnswerFromResponse(response.content);
    
    return finalAnswerContent;
  }

  /**
   * Extract final answer from response (for parallel processing - no markers needed)
   */
  private extractFinalAnswerFromResponse(content: string): string {
    // No markers needed for parallel processing, return full content
    console.log('Returning full content as final answer (parallel processing)');
    console.log('Final answer length:', content.length);
    return content;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(steps: DeepResearchStep[]): number {
    if (steps.length === 0) return 0;
    
    const totalConfidence = steps.reduce((sum, step) => sum + step.confidence, 0);
    return totalConfidence / steps.length;
  }

  /**
   * Generate methodology description
   */
  private generateMethodologyDescription(): string {
    const depth = this.config.analysisDepth;
    const stepCount = this.config.maxSteps;
    
    return `Deep Research Methodology: ${depth === 'basic' ? 'Basic' : depth === 'intermediate' ? 'Intermediate' : 'Advanced'} Analysis (${stepCount} steps)`;
  }

  /**
   * Generate system prompt
   */
  private getSystemPrompt(): string {
    return `You are a professional researcher and analyst. You must perform deep and systematic analysis of the given questions.

CRITICAL FORMATTING RULES:
- Do NOT use markdown formatting (no ##, ###, **, *, etc.)
- Do NOT use emojis or special symbols
- Use plain text with clear structure using colons and bullet points
- Always detect the language of the input question and respond in the same language

If the question is in Korean, respond in Korean. If the question is in English, respond in English. If the question is in another language, respond in that language.

Analysis guidelines:
1. Maintain objective and balanced perspectives
2. Explore topics from various angles
3. Provide specific examples and evidence
4. Answer with logical and systematic structure using plain text
5. Clearly mark uncertain parts
6. Use professional terminology appropriately
7. Always respond in the same language as the input
8. Structure responses with colons and bullet points, not markdown headers

Analysis depth: ${this.config.analysisDepth}
Default language preference: ${this.config.language === 'ko' ? 'Korean' : 'English'}`;
  }

  /**
   * Generate system prompt for final answer
   */
  private getFinalAnswerSystemPrompt(): string {
    return `You are a professional researcher and analyst. You must provide a comprehensive and well-structured final answer based on the conducted deep research.

CRITICAL FORMATTING RULES FOR FINAL ANSWER:
- You MAY use markdown formatting (##, ###, **, *, etc.) to structure your response clearly and effectively
- Do NOT use emojis or special symbols
- Use markdown headers, bullet points, and formatting to enhance readability
- Always detect the language of the input question and respond in the same language

If the question is in Korean, respond in Korean. If the question is in English, respond in English. If the question is in another language, respond in that language.

Final answer guidelines:
1. Maintain objective and balanced perspectives
2. Synthesize findings from multiple analyses
3. Provide specific examples and evidence
4. Answer with logical and systematic structure using markdown formatting
5. Clearly mark uncertain parts
6. Use professional terminology appropriately
7. Always respond in the same language as the input
8. Structure responses with markdown headers for clear organization

Analysis depth: ${this.config.analysisDepth}
Default language preference: ${this.config.language === 'ko' ? 'Korean' : 'English'}`;
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(query: string, context: string): string {
    return `Please analyze the following question deeply and establish a systematic approach:

Question: "${query}"
${context ? `Context: ${context}` : ''}

Analysis elements:
1. Define core concepts of the question
2. Identify key perspectives to analyze
3. Consider important factors
4. Approach methodology
5. Expected complexity and difficulty

Perform systematic and in-depth analysis.`;
  }
}

/**
 * Deep research utility functions
 */
export class DeepResearchUtils {
  /**
   * Convert deep research result to markdown format
   */
  static formatResultAsMarkdown(result: DeepResearchResult): string {
    let markdown = `# Deep Research Result: ${result.query}\n\n`;
    
    markdown += `## 📊 Research Overview\n`;
    markdown += `- **Confidence**: ${(result.confidence * 100).toFixed(1)}%\n`;
    markdown += `- **Methodology**: ${result.methodology}\n`;
    markdown += `- **Analysis Steps**: ${result.steps.length} steps\n\n`;

    markdown += `## 🔍 Analysis Process\n\n`;
    result.steps.forEach((step, index) => {
      markdown += `### ${index + 1}. ${step.title}\n`;
      markdown += `**Question**: ${step.question}\n\n`;
      markdown += `${step.analysis}\n\n`;
      markdown += `**Confidence**: ${(step.confidence * 100).toFixed(1)}%\n\n`;
    });

    markdown += `## 🎯 Synthesis Analysis\n\n`;
    markdown += `${result.synthesis}\n\n`;

    markdown += `## 💡 Final Answer\n\n`;
    markdown += `${result.finalAnswer}\n\n`;

    return markdown;
  }

  /**
   * Convert deep research result to summary format
   */
  static formatResultAsSummary(result: DeepResearchResult): string {
    return `**Question**: ${result.query}\n\n${result.finalAnswer}\n\n*${result.steps.length}-step deep research performed (Confidence: ${(result.confidence * 100).toFixed(1)}%)*`;
  }
}

export default DeepResearchProcessor;
