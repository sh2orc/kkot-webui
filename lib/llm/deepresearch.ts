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
   * 딥리서치 수행 - 개선된 구조
   */
  async performDeepResearch(
    query: string,
    context: string = "",
    onProgress?: (step: DeepResearchStep) => void,
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void
  ): Promise<DeepResearchResult> {
    try {
      console.log('=== Deep Research Started ===');
      console.log('Query:', query);
      
      // 1단계: Sub-questions 생성 및 즉시 표시
      console.log('1. Generating and displaying sub-questions...');
      const subQuestions = await this.generateSubQuestions(query, context);
      console.log('Sub-questions generated:', subQuestions);
      
      // 계획된 스탭들을 미리 전달 (sub-questions를 먼저 표시)
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

      // 1.5. Sub-questions 즉시 표시
      console.log('1.5. Displaying sub-questions immediately...');
      if (onStream) {
        const subQuestionsContent = `## [Analysis Start] Sub-questions Generated

### 🎯 Generated Sub-questions
다음과 같은 세부 질문들을 분석하겠습니다:

${subQuestions.map((q, i) => `**${i + 1}. ${q}**`).join('\n\n')}

### 📋 Analysis Plan
각 질문에 대해 체계적으로 분석을 진행하겠습니다.

### 🔍 Analysis Methodology
- 각 세부 질문에 대한 심층 분석 수행
- 다양한 관점에서의 접근
- 이전 분석 결과와의 연관성 검토
- 종합적인 결론 도출`;
        
        onStream(subQuestionsContent, 'step', { 
          title: 'Sub-questions Generated', 
          isComplete: true
        });
      }

      // 2단계: 초기 질문 분석
      console.log('3. Starting initial query analysis...');
      const analysisStep = await this.analyzeQuery(query, context, onStream);
      console.log('Initial analysis completed:', analysisStep.title);

      // 3단계: 각 Sub-question 분석 (개별 컴포넌트에 매핑)
      const steps = [analysisStep];
      
      console.log('4. Starting sub-question analysis...');
      for (let i = 0; i < Math.min(subQuestions.length, this.config.maxSteps - 1); i++) {
        const subQuestion = subQuestions[i];
        const plannedTitle = `Analysis: ${subQuestion}`;
        console.log(`4.${i+1}. Analyzing sub-question: ${plannedTitle}`);
        const step = await this.analyzeSubQuestion(subQuestion, context, steps, onStream, plannedTitle);
        steps.push(step);
        console.log(`4.${i+1}. Sub-question analysis completed`);
      }

      // 4단계: 종합 분석
      console.log('5. Starting synthesis...');
      const synthesis = await this.synthesizeFindings(query, steps, onStream);
      console.log('Synthesis completed');
      
      // 5단계: 최종 답변 생성
      console.log('6. Generating final answer...');
      const finalAnswer = await this.generateFinalAnswer(query, steps, synthesis, onStream);
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
   * 단계별 딥리서치 수행 - 1단계: Sub-questions 생성
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
   * 단계별 딥리서치 수행 - 2단계: 초기 질문 분석
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
   * 단계별 딥리서치 수행 - 3단계: 개별 Sub-question 분석
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
   * 단계별 딥리서치 수행 - 4단계: 종합 분석
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
   * 단계별 딥리서치 수행 - 5단계: 최종 답변 생성
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
   * 초기 질문 분석
   */
  private async analyzeQuery(query: string, context: string, onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void): Promise<DeepResearchStep> {
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

Analysis Methodology:
- Present a systematic approach to this question

Expected Complexity and Difficulty:
- Evaluate the complexity and analysis difficulty of this question

Please perform systematic and in-depth analysis without using markdown formatting.`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    console.log('Sending start signal for Question Analysis');
    // 스트리밍으로 진행 상황 전송 (상태만)
    if (onStream) {
      onStream('', 'step', { title: 'Question Analysis', isComplete: false });
    }

    console.log('Calling LLM for analysis...');
    const response = await this.llm.chat(messages);
    console.log('LLM response received, length:', response.content.length);
    
    console.log('Sending completion signal for Question Analysis');
    // 완료 후 결과 전송
    if (onStream) {
      onStream(response.content, 'step', { title: 'Question Analysis', isComplete: true });
    }
    
    console.log('analyzeQuery completed');
    return {
      id: `step-analysis-${Date.now()}`,
      title: "Question Analysis",
      question: query,
      analysis: response.content,
      confidence: 0.8
    };
  }

  /**
   * 하위 질문 생성 - 개선된 추출 로직
   */
  private async generateSubQuestions(query: string, context: string): Promise<string[]> {
    const prompt = `Generate 3-4 sub-questions to deeply analyze the following question. Detect the language of the input and respond in the same language. Do not use markdown formatting or emojis in your response.

Question: "${query}"
${context ? `Context: ${context}` : ''}

Create sub-questions from each of the following perspectives:
- Core concept analysis
- Multi-perspective exploration
- Specific case studies
- Impact and outcome analysis

Please list them in exactly the following format without any formatting:
1. [Question content]
2. [Question content]
3. [Question content]
4. [Question content]`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    const response = await this.llm.chat(messages);
    
    // 응답에서 질문들 추출 - 더 견고한 로직
    const questions = response.content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim())
      .filter(line => /^\d+[.)]\s*/.test(line)) // 숫자 + 점 또는 괄호 패턴
      .map(line => line.replace(/^\d+[.)]\s*/, '').trim()) // 번호 제거
      .filter(q => q.length > 0 && q.length < 200); // 빈 문자열 및 너무 긴 문자열 제거

    console.log('Generated sub-questions:', questions);
    return questions.slice(0, 4); // 최대 4개 질문
  }

  /**
   * 하위 질문 분석 - 정확한 제목 매칭
   */
  private async analyzeSubQuestion(
    question: string, 
    context: string, 
    previousSteps: DeepResearchStep[],
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void,
    plannedTitle?: string
  ): Promise<DeepResearchStep> {
    const previousContext = previousSteps
      .map(step => `${step.title}: ${step.analysis}`)
      .join('\n\n');

    const prompt = `Please analyze the following sub-question systematically. Detect the language of the input and respond in the same language. Do not use markdown formatting or emojis in your response.

Question: "${question}"
${context ? `Original Context: ${context}` : ''}

Previous Analysis Results:
${previousContext}

Please analyze using the following structure without markdown headers:

[Analysis Start] ${question}

Core Analysis:
- Explain the key points and importance of this question

Detailed Analysis:
- Present specific analysis content and data

Key Findings:
- Summarize the main insights discovered from this analysis

Relationship Analysis:
- Explain the relationship with previous analysis results

Multi-perspective Review:
- Present the results of reviewing from various perspectives

Please perform systematic and in-depth analysis without using markdown formatting.`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // 계획된 제목이 있으면 사용, 없으면 기본 제목 사용
    const stepTitle = plannedTitle || `Analysis: ${question}`;

    // 스트리밍으로 진행 상황 전송 (상태만)
    if (onStream) {
      onStream('', 'step', { title: stepTitle, isComplete: false });
    }

    const response = await this.llm.chat(messages);
    
    // 완료 후 결과 전송
    if (onStream) {
      onStream(response.content, 'step', { title: stepTitle, isComplete: true });
    }
    
    return {
      id: `step-${Date.now()}`,
      title: stepTitle,
      question,
      analysis: response.content,
      confidence: 0.75
    };
  }

  /**
   * 종합 분석 수행
   */
  private async synthesizeFindings(query: string, steps: DeepResearchStep[], onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void): Promise<string> {
    const findings = steps
      .map(step => `## ${step.title}\n${step.analysis}`)
      .join('\n\n');

    const prompt = `Please synthesize the multi-perspective analysis results for the question "${query}". Detect the language of the input and respond in the same language. Do not use markdown formatting or emojis in your response.

${findings}

Please perform synthesis analysis using the following structure without markdown headers:

[Analysis Start] Synthesis Analysis

Common Patterns and Themes:
- Organize patterns and themes that commonly appear in multiple analyses

Reconciling Conflicting Perspectives:
- Reconcile and integrate different perspectives

Core Insights:
- Present the core insights derived from the synthesis analysis

Unresolved Questions:
- Identify unresolved questions that require further research

Limitations of Analysis:
- Explain the limitations and constraints of the current analysis

Please perform comprehensive and systematic analysis without using markdown formatting.`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // 스트리밍으로 진행 상황 전송 (상태만)
    if (onStream) {
      onStream('', 'synthesis', { title: 'Synthesis Analysis', isComplete: false });
    }

    const response = await this.llm.chat(messages);
    
    // 완료 후 결과 전송
    if (onStream) {
      onStream(response.content, 'synthesis', { title: 'Synthesis Analysis', isComplete: true });
    }
    
    return response.content;
  }

  /**
   * 최종 답변 생성
   */
  private async generateFinalAnswer(
    query: string, 
    steps: DeepResearchStep[], 
    synthesis: string,
    onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void
  ): Promise<string> {
    const prompt = `Original Question: "${query}"

Performed Analyses:
${steps.map(step => `- ${step.title}: ${step.analysis}`).join('\n')}

Synthesis Analysis:
${synthesis}

CRITICAL INSTRUCTION - LANGUAGE DETECTION AND RESPONSE:
Please carefully examine the original question "${query}" and detect its language. You must respond in the EXACT SAME LANGUAGE as the original question. This is absolutely critical.

- If the original question is in Korean (한국어), respond entirely in Korean
- If the original question is in English, respond entirely in English  
- If the original question is in Japanese (日本語), respond entirely in Japanese
- If the original question is in Chinese (中文), respond entirely in Chinese
- For any other language, respond in that detected language

Based on all the analyses above, please provide a comprehensive and in-depth final answer to the original question. Do not use markdown formatting or emojis in your response.

IMPORTANT: When writing the final answer, please follow this format strictly without using markdown headers, and write ALL content in the same language as the original question:

1. First, freely write any analysis process or additional explanations
2. Below write the final answer with the following structure (using appropriate language):
   - Core answer (clear and direct response)
   - Detailed analysis (key perspectives and evidence)  
   - Considerations (limitations, various viewpoints)
   - Conclusion (summary and future directions)

Format example without markdown (adapt section headers to the detected language):

[Analysis process or additional explanations in the original question's language]

Core Answer: (or 핵심 답변: for Korean, or 核心回答: for Chinese, etc.)
[Content in original language]

Detailed Analysis: (or 상세 분석: for Korean, or 詳細分析: for Chinese, etc.)
[Content in original language]

Considerations: (or 고려사항: for Korean, or 考慮事項: for Chinese, etc.)
[Content in original language]

Conclusion: (or 결론: for Korean, or 結論: for Chinese, etc.)
[Content in original language]

Remember: The entire response must be in the same language as the original question "${query}".`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // 스트리밍으로 진행 상황 전송 (상태만)
    if (onStream) {
      onStream('', 'final', { title: 'Final Answer', isComplete: false });
    }

    const response = await this.llm.chat(messages);
    
    // 스트리밍 중에는 전체 내용을 전송하고, 완료 후 결과에서만 마커 추출
    if (onStream) {
      // 스트리밍 중에는 전체 내용 전송 (마커 추출 없이)
      onStream(response.content, 'final', { title: 'Final Answer', isComplete: true });
    }
    
    // 최종 반환값에서만 마커 이후 부분 추출
    const finalAnswerContent = this.extractFinalAnswerFromResponse(response.content);
    
    return finalAnswerContent;
  }

  /**
   * 응답에서 최종 답변 추출 (병렬 처리용 - 마커 불필요)
   */
  private extractFinalAnswerFromResponse(content: string): string {
    // 병렬 처리에서는 마커가 필요 없으므로 전체 내용 반환
    console.log('Returning full content as final answer (parallel processing)');
    console.log('Final answer length:', content.length);
    return content;
  }

  /**
   * 전체 신뢰도 계산
   */
  private calculateOverallConfidence(steps: DeepResearchStep[]): number {
    if (steps.length === 0) return 0;
    
    const totalConfidence = steps.reduce((sum, step) => sum + step.confidence, 0);
    return totalConfidence / steps.length;
  }

  /**
   * 방법론 설명 생성
   */
  private generateMethodologyDescription(): string {
    const depth = this.config.analysisDepth;
    const stepCount = this.config.maxSteps;
    
    return `Deep Research Methodology: ${depth === 'basic' ? 'Basic' : depth === 'intermediate' ? 'Intermediate' : 'Advanced'} Analysis (${stepCount} steps)`;
  }

  /**
   * 시스템 프롬프트 생성
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
   * 분석 프롬프트 생성
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
 * 딥리서치 유틸리티 함수들
 */
export class DeepResearchUtils {
  /**
   * 딥리서치 결과를 마크다운 형식으로 변환
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
   * 딥리서치 결과를 요약 형식으로 변환
   */
  static formatResultAsSummary(result: DeepResearchResult): string {
    return `**Question**: ${result.query}\n\n${result.finalAnswer}\n\n*${result.steps.length}-step deep research performed (Confidence: ${(result.confidence * 100).toFixed(1)}%)*`;
  }
}

export default DeepResearchProcessor;
