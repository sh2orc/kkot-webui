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
   * 딥리서치 수행
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
      
      // 1. 하위 질문들을 먼저 생성
      console.log('1. Generating sub-questions...');
      const subQuestions = await this.generateSubQuestions(query, context);
      console.log('Sub-questions generated:', subQuestions);
      
      // 계획된 스탭들을 미리 전달
      const plannedSteps = [
        { title: '질문 분석', type: 'step' },
        ...subQuestions.map(q => ({ title: `분석: ${q}`, type: 'step' })),
        { title: '종합 분석', type: 'synthesis' },
        { title: '최종 답변', type: 'final' }
      ];

      console.log('2. Sending planned steps:', plannedSteps);
      if (onStream) {
        onStream('딥리서치 계획이 수립되었습니다.', 'step', { 
          title: '분석 계획 수립', 
          isComplete: true,
          totalSteps: plannedSteps.length,
          plannedSteps: plannedSteps
        } as any);
      }

      // 2. 초기 질문 분석
      console.log('3. Starting initial query analysis...');
      const analysisStep = await this.analyzeQuery(query, context, onStream);
      console.log('Initial analysis completed:', analysisStep.title);

      // 3. 다각도 분석 수행 - 계획된 제목과 정확히 일치하도록 전달
      const steps = [analysisStep];
      
      console.log('4. Starting sub-question analysis...');
      for (let i = 0; i < Math.min(subQuestions.length, this.config.maxSteps - 1); i++) {
        const subQuestion = subQuestions[i];
        const plannedTitle = `분석: ${subQuestion}`;
        console.log(`4.${i+1}. Analyzing sub-question: ${plannedTitle}`);
        const step = await this.analyzeSubQuestion(subQuestion, context, steps, onStream, plannedTitle);
        steps.push(step);
        console.log(`4.${i+1}. Sub-question analysis completed`);
      }

      // 4. 종합 분석 수행
      console.log('5. Starting synthesis...');
      const synthesis = await this.synthesizeFindings(query, steps, onStream);
      console.log('Synthesis completed');
      
      // 5. 최종 답변 생성
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
      throw new Error(`딥리서치 수행 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 초기 질문 분석
   */
  private async analyzeQuery(query: string, context: string, onStream?: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => void): Promise<DeepResearchStep> {
    console.log('analyzeQuery started');
    const prompt = this.buildAnalysisPrompt(query, context);
    
    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    console.log('Sending start signal for 질문 분석');
    // 스트리밍으로 진행 상황 전송 (상태만)
    if (onStream) {
      onStream('', 'step', { title: '질문 분석', isComplete: false });
    }

    console.log('Calling LLM for analysis...');
    const response = await this.llm.chat(messages);
    console.log('LLM response received, length:', response.content.length);
    
    console.log('Sending completion signal for 질문 분석');
    // 완료 후 결과 전송
    if (onStream) {
      onStream(response.content, 'step', { title: '질문 분석', isComplete: true });
    }
    
    console.log('analyzeQuery completed');
    return {
      id: `step-analysis-${Date.now()}`,
      title: "질문 분석",
      question: query,
      analysis: response.content,
      confidence: 0.8
    };
  }

  /**
   * 하위 질문 생성 - 개선된 추출 로직
   */
  private async generateSubQuestions(query: string, context: string): Promise<string[]> {
    const prompt = `다음 질문을 깊이 분석하기 위해 3-4개의 하위 질문을 생성해주세요:

질문: "${query}"
${context ? `맥락: ${context}` : ''}

각 하위 질문은 다음과 같은 관점에서 접근해야 합니다:
- 핵심 개념 분석
- 다양한 관점 탐색
- 구체적 사례 조사
- 영향 및 결과 분석

하위 질문들을 다음 형식으로 정확히 나열해주세요:
1. [질문 내용]
2. [질문 내용]
3. [질문 내용]
4. [질문 내용]`;

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

    const prompt = `다음 하위 질문을 분석해주세요:

질문: "${question}"
${context ? `원본 맥락: ${context}` : ''}

이전 분석 결과:
${previousContext}

이 질문에 대해 체계적이고 깊이 있는 분석을 수행하세요.`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // 계획된 제목이 있으면 사용, 없으면 기본 제목 사용
    const stepTitle = plannedTitle || `분석: ${question}`;

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

    const prompt = `다음은 "${query}"에 대한 다각도 분석 결과입니다:

${findings}

위 분석들을 종합하여 핵심 인사이트와 패턴을 도출해주세요. 
다음 관점에서 종합 분석을 수행하세요:
- 공통 주제와 패턴 식별
- 상충되는 관점들의 조화
- 핵심 인사이트 도출
- 미해결 질문이나 추가 연구 필요 영역 식별`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // 스트리밍으로 진행 상황 전송 (상태만)
    if (onStream) {
      onStream('', 'synthesis', { title: '종합 분석', isComplete: false });
    }

    const response = await this.llm.chat(messages);
    
    // 완료 후 결과 전송
    if (onStream) {
      onStream(response.content, 'synthesis', { title: '종합 분석', isComplete: true });
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
    const prompt = `원래 질문: "${query}"

수행한 분석들:
${steps.map(step => `- ${step.title}: ${step.analysis.substring(0, 200)}...`).join('\n')}

종합 분석:
${synthesis}

위 모든 분석을 바탕으로 원래 질문에 대한 포괄적이고 깊이 있는 최종 답변을 제공해주세요.
답변은 다음과 같은 구조로 작성하세요:

1. 핵심 답변 (명확하고 직접적인 답변)
2. 상세 분석 (주요 관점들과 근거)
3. 고려사항 (제한사항, 다양한 관점)
4. 결론 (요약 및 향후 방향)`;

    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ];

    // 스트리밍으로 진행 상황 전송 (상태만)
    if (onStream) {
      onStream('', 'final', { title: '최종 답변', isComplete: false });
    }

    const response = await this.llm.chat(messages);
    
    // 완료 후 결과 전송
    if (onStream) {
      onStream(response.content, 'final', { title: '최종 답변', isComplete: true });
    }
    
    return response.content;
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
    
    return `딥리서치 방법론: ${depth === 'basic' ? '기본' : depth === 'intermediate' ? '중급' : '고급'} 분석 (${stepCount}단계)`;
  }

  /**
   * 시스템 프롬프트 생성
   */
  private getSystemPrompt(): string {
    return `당신은 전문 연구자이자 분석가입니다. 주어진 질문에 대해 깊이 있고 체계적인 분석을 수행해야 합니다.

분석 지침:
1. 객관적이고 균형 잡힌 관점을 유지하세요
2. 다양한 각도에서 주제를 탐구하세요
3. 구체적인 예시와 근거를 제시하세요
4. 논리적이고 체계적인 구조로 답변하세요
5. 불확실한 부분은 명확히 표시하세요
6. 한국어로 답변하되, 전문 용어는 적절히 사용하세요

분석 깊이: ${this.config.analysisDepth}
언어: ${this.config.language === 'ko' ? '한국어' : 'English'}`;
  }

  /**
   * 분석 프롬프트 생성
   */
  private buildAnalysisPrompt(query: string, context: string): string {
    return `다음 질문을 깊이 분석하고 체계적인 접근법을 수립해주세요:

질문: "${query}"
${context ? `맥락: ${context}` : ''}

분석 요소:
1. 질문의 핵심 개념 정의
2. 분석해야 할 주요 관점들
3. 고려해야 할 요소들
4. 접근 방법론
5. 예상되는 복잡성과 난이도

체계적이고 깊이 있는 분석을 수행하세요.`;
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
    let markdown = `# 딥리서치 결과: ${result.query}\n\n`;
    
    markdown += `## 📊 연구 개요\n`;
    markdown += `- **신뢰도**: ${(result.confidence * 100).toFixed(1)}%\n`;
    markdown += `- **방법론**: ${result.methodology}\n`;
    markdown += `- **분석 단계**: ${result.steps.length}단계\n\n`;

    markdown += `## 🔍 분석 과정\n\n`;
    result.steps.forEach((step, index) => {
      markdown += `### ${index + 1}. ${step.title}\n`;
      markdown += `**질문**: ${step.question}\n\n`;
      markdown += `${step.analysis}\n\n`;
      markdown += `**신뢰도**: ${(step.confidence * 100).toFixed(1)}%\n\n`;
    });

    markdown += `## 🎯 종합 분석\n\n`;
    markdown += `${result.synthesis}\n\n`;

    markdown += `## 💡 최종 답변\n\n`;
    markdown += `${result.finalAnswer}\n\n`;

    return markdown;
  }

  /**
   * 딥리서치 결과를 요약 형식으로 변환
   */
  static formatResultAsSummary(result: DeepResearchResult): string {
    return `**질문**: ${result.query}\n\n${result.finalAnswer}\n\n*${result.steps.length}단계 딥리서치 수행 (신뢰도: ${(result.confidence * 100).toFixed(1)}%)*`;
  }
}

export default DeepResearchProcessor;
