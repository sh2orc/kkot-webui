import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LLMFactory } from '@/lib/llm';
import { DeepResearchProcessor, DeepResearchUtils } from '@/lib/llm/deepresearch';
import { llmModelRepository, llmServerRepository } from '@/lib/db/server';

// Track active requests to prevent duplicates
const activeRequests = new Map<string, Promise<any>>();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const { query, context, modelId, modelType } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Generate unique key to prevent duplicate requests
    const requestKey = `${session.user.email}_${query.trim()}_${modelId}`;
    
    // Check if there is already an identical request being processed
    if (activeRequests.has(requestKey)) {
      console.log('Duplicate deep research request detected, waiting for existing request');
      try {
        // Wait for existing request to complete
        await activeRequests.get(requestKey);
        return NextResponse.json({ error: 'Duplicate request detected' }, { status: 429 });
      } catch (error) {
        // If existing request failed, proceed with new request
        activeRequests.delete(requestKey);
      }
    }

    console.log('Deep research request:', { query, modelId, modelType });

    // Retrieve model information
    const modelResult = await llmModelRepository.findById(modelId);
    if (!modelResult || modelResult.length === 0) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    
    const model = modelResult[0];
    
    // Retrieve server information
    const serverResult = await llmServerRepository.findById(model.serverId);
    if (!serverResult || serverResult.length === 0) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }
    
    const server = serverResult[0];

    // LLM settings
    const llmConfig = {
      provider: server.provider as any,
      modelName: model.modelId,
      apiKey: server.apiKey || undefined,
      baseUrl: server.baseUrl,
      temperature: 0.7,
      maxTokens: 4096
    };

    // Create LLM client
    const llmClient = LLMFactory.create(llmConfig);

    // Create deep research processor
    const processor = new DeepResearchProcessor(llmClient, {
      maxSteps: 5,
      analysisDepth: 'intermediate',
      language: 'ko'
    });

    // Create AbortController for this request
    const abortController = new AbortController();
    
    // Generate streaming response
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

        // Generate and register request processing Promise
        const processingPromise = (async () => {
          try {
            // Execute deep research with abort signal
            const result = await processor.performDeepResearch(
              query,
              context,
              undefined,
              (content: string, stepType: 'step' | 'synthesis' | 'final', stepInfo?: { title?: string, isComplete?: boolean }) => {
                // Send streaming content
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
              },
              abortController.signal
            );

            // Send final result (with markers extracted) after deep research completion
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
            
            // Send error message
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
            // Remove from cache after request completion
            activeRequests.delete(requestKey);
          }
        })();

        // Register in active request map
        activeRequests.set(requestKey, processingPromise);

        // Start processing
        await processingPromise;
      },
      
      cancel(reason) {
        console.log('ReadableStream cancelled:', reason);
        // Abort the deep research when stream is cancelled
        abortController.abort(reason);
        // Remove from active requests
        activeRequests.delete(requestKey);
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