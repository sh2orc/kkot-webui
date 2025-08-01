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

    const { subQuestion, originalQuery, modelId, context = "", previousSteps = [] } = await request.json();

    if (!subQuestion?.trim() || !originalQuery?.trim() || !modelId) {
      return NextResponse.json({ 
        error: 'SubQuestion, originalQuery, and modelId are required' 
      }, { status: 400 });
    }

    console.log('=== Sub-question Analysis Step ===');
    console.log('Sub-question:', subQuestion);
    console.log('Original Query:', originalQuery);
    console.log('Model:', modelId);

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
      maxSteps: 4,
      confidenceThreshold: 0.8,
      analysisDepth: 'intermediate',
      includeSourceCitations: false,
      language: 'ko'
    });

    // Execute sub-question analysis
    const result = await processor.analyzeSubQuestionStep(
      subQuestion,
      originalQuery,
      context,
      previousSteps
    );
    
    console.log('Sub-question analysis completed');

    return NextResponse.json({
      success: true,
      analysis: result,
      stepTitle: `Analysis: ${subQuestion}`
    });

  } catch (error) {
    console.error('Sub-question analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze sub-question',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 