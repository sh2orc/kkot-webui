// Reranking strategies API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragRerankingStrategyRepository, llmModelRepository } from '@/lib/db/repository';

// GET /api/rag/reranking-strategies - List all reranking strategies
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const strategies = await ragRerankingStrategyRepository.findAllWithModel();
    
    // Get available reranking models
    const allModels = await llmModelRepository.findAllWithServer();
    const rerankingModels = allModels.filter((model: any) => {
      // Check if model is a reranking model
      if (model.isRerankingModel) return true;
      
      // Parse capabilities if it's a JSON string
      if (model.capabilities) {
        try {
          const capabilities = typeof model.capabilities === 'string' 
            ? JSON.parse(model.capabilities) 
            : model.capabilities;
          
          if (Array.isArray(capabilities) && capabilities.includes('reranking')) {
            return true;
          }
        } catch (e) {
          // If capabilities is not valid JSON, ignore
        }
      }
      
      // Check model name
      if (model.name?.toLowerCase().includes('rerank') ||
          model.modelId?.toLowerCase().includes('rerank')) {
        return true;
      }
      
      return false;
    });
    
    // Available types that can be used
    const availableTypes = ['model_based', 'rule_based', 'hybrid', 'none'];
    
    return NextResponse.json({ 
      strategies,
      availableTypes,
      rerankingModels,
    });
  } catch (error) {
    console.error('Failed to fetch reranking strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reranking strategies' },
      { status: 500 }
    );
  }
}

// POST /api/rag/reranking-strategies - Create a new reranking strategy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, rerankingModelId, topK, minScore, settings, isDefault } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    const availableTypes = ['model_based', 'rule_based', 'hybrid', 'none'];
    if (!availableTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid reranking strategy type. Available types: ${availableTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate model requirement for model_based type
    if (type === 'model_based' && !rerankingModelId) {
      return NextResponse.json(
        { error: 'Model is required for model-based reranking strategy' },
        { status: 400 }
      );
    }

    // Create the strategy
    const result = await ragRerankingStrategyRepository.create({
      name,
      type,
      rerankingModelId: rerankingModelId || null,
      topK: topK || 10,
      minScore: minScore || null,
      settings,
      isDefault: isDefault || false,
    });

    return NextResponse.json({ strategy: result[0] });
  } catch (error: any) {
    if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') { // Unique violation
      return NextResponse.json(
        { error: 'A strategy with this name already exists' },
        { status: 400 }
      );
    }
    
    console.error('Failed to create reranking strategy:', error);
    return NextResponse.json(
      { error: 'Failed to create reranking strategy' },
      { status: 500 }
    );
  }
}
