import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LLMFactory } from '@/lib/llm';
import { DeepResearchProcessor } from '@/lib/llm/deepresearch';
import { llmModelRepository, llmServerRepository } from '@/lib/db/server';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const { query, modelId, context = "" } = await request.json();

    if (!query?.trim() || !modelId) {
      return NextResponse.json({ 
        error: 'Query and modelId are required' 
      }, { status: 400 });
    }

    console.log('=== Generating Sub-questions ===');
    console.log('Query:', query);
    console.log('Model:', modelId);

    // 모델 정보 조회
    const modelResult = await llmModelRepository.findById(modelId);
    if (!modelResult || modelResult.length === 0) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    
    const model = modelResult[0];
    
    // 서버 정보 조회
    const serverResult = await llmServerRepository.findById(model.serverId);
    if (!serverResult || serverResult.length === 0) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }
    
    const server = serverResult[0];

    // LLM 설정
    const llmConfig = {
      provider: server.provider as any,
      modelName: model.modelId,
      apiKey: server.apiKey || undefined,
      baseUrl: server.baseUrl,
      temperature: 0.7,
      maxTokens: 4096
    };

    // LLM 클라이언트 생성
    const llmClient = LLMFactory.create(llmConfig);
    
    // Create deep research processor
    const processor = new DeepResearchProcessor(llmClient, {
      maxSteps: 4,
      confidenceThreshold: 0.8,
      analysisDepth: 'intermediate',
      includeSourceCitations: false,
      language: 'ko'
    });

    // Generate sub-questions
    const result = await processor.generateSubQuestionsStep(query, context);
    
    console.log('Sub-questions generated successfully');
    console.log('Sub-questions:', result.subQuestions);

    return NextResponse.json({
      success: true,
      subQuestions: result.subQuestions,
      plannedSteps: result.plannedSteps,
      query
    });

  } catch (error) {
    console.error('Sub-questions generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate sub-questions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 