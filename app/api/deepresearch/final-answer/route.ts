import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LLMFactory } from '@/lib/llm';
import { DeepResearchProcessor } from '@/lib/llm/deepresearch';
import { llmModelRepository, llmServerRepository } from '@/lib/db/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const { query, modelId, analysisSteps = [], synthesis = "" } = await request.json();

    if (!query?.trim() || !modelId || !Array.isArray(analysisSteps) || !synthesis?.trim()) {
      return NextResponse.json({ 
        error: 'Query, modelId, analysisSteps, and synthesis are required' 
      }, { status: 400 });
    }

    console.log('=== Final Answer Step ===');
    console.log('Query:', query);
    console.log('Model:', modelId);
    console.log('Analysis Steps Count:', analysisSteps.length);
    console.log('Synthesis Length:', synthesis.length);

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

    // LLM configuration
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
      maxSteps: 4,
      confidenceThreshold: 0.8,
      analysisDepth: 'intermediate',
      includeSourceCitations: false,
      language: 'ko'
    });

    // Generate final answer
    const result = await processor.generateFinalAnswerStep(query, analysisSteps, synthesis);
    
    console.log('Final answer generated');

    return NextResponse.json({
      success: true,
      finalAnswer: result,
      stepTitle: 'Final Answer'
    });

  } catch (error) {
    console.error('Final answer error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate final answer',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 