import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LLMFactory } from '@/lib/llm';
import { DeepResearchProcessor, DeepResearchUtils } from '@/lib/llm/deepresearch';
import { llmModelRepository, llmServerRepository } from '@/lib/db/server';

// 중복 요청 방지를 위한 활성 요청 추적
const activeRequests = new Map<string, Promise<any>>();

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const { query, context, modelId, modelType } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 중복 요청 방지를 위한 고유 키 생성
    const requestKey = `${session.user.email}_${query.trim()}_${modelId}`;
    
    // 이미 처리 중인 동일한 요청이 있는지 확인
    if (activeRequests.has(requestKey)) {
      console.log('Duplicate deep research request detected, waiting for existing request');
      try {
        // 기존 요청 완료 대기
        await activeRequests.get(requestKey);
        return NextResponse.json({ error: 'Duplicate request detected' }, { status: 429 });
      } catch (error) {
        // 기존 요청이 실패한 경우 새로운 요청 진행
        activeRequests.delete(requestKey);
      }
    }

    console.log('Deep research request:', { query, modelId, modelType });

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

    // 딥리서치 프로세서 생성
    const processor = new DeepResearchProcessor(llmClient, {
      maxSteps: 5,
      analysisDepth: 'intermediate',
      language: 'ko'
    });

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        let controllerClosed = false;
        
        const safeEnqueue = (data: Uint8Array) => {
          try {
            if (!controllerClosed && controller.desiredSize !== null) {
              controller.enqueue(data);
              return true;
            }
          } catch (error) {
            console.log('Controller enqueue failed:', error);
            controllerClosed = true;
          }
          return false;
        };
        
        const safeClose = () => {
          if (!controllerClosed) {
            try {
              controller.close();
              controllerClosed = true;
            } catch (error) {
              console.log('Controller close failed:', error);
              controllerClosed = true;
            }
          }
        };

        // 요청 처리 Promise 생성 및 등록
        const processingPromise = (async () => {
          try {
            // 딥리서치 실행
            const result = await processor.performDeepResearch(
              query,
              context,
              undefined,
              (content: string, stepType: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => {
                // 스트리밍 콘텐츠 전송
                safeEnqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ 
                      type: 'stream', 
                      content,
                      stepType,
                      stepInfo: stepInfo || {},
                      timestamp: Date.now()
                    })}\n\n`
                  )
                );
              }
            );

            // 딥리서치 완료 후 최종 결과 (마커 추출된) 전송
            safeEnqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ 
                  type: 'final', 
                  content: result.finalAnswer,
                  timestamp: Date.now()
                })}\n\n`
              )
            );

            safeClose();
            return result;
          } catch (error) {
            console.error('Deep research error:', error);
            
            // 에러 메시지 전송
            safeEnqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ 
                  type: 'error', 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                })}\n\n`
              )
            );
            
            safeClose();
            throw error;
          } finally {
            // 요청 완료 후 캐시에서 제거
            activeRequests.delete(requestKey);
          }
        })();

        // 활성 요청 맵에 등록
        activeRequests.set(requestKey, processingPromise);

        // 처리 시작
        await processingPromise;
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Deep research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 