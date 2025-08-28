import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragRerankingStrategyRepository } from '@/lib/db/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const strategy = await ragRerankingStrategyRepository.findByIdWithModel(id);
    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('Failed to fetch reranking strategy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reranking strategy' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, type, rerankingModelId, topK, minScore, settings, isDefault } = body;
    
    console.log('Update request for strategy ID:', id);
    console.log('Request body:', body);

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
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

    const updateData = {
      name,
      type,
      rerankingModelId: rerankingModelId || null,
      topK: topK ? parseInt(topK) : 10,
      minScore: minScore || null,
      settings,
      isDefault: isDefault || false,
    };
    
    console.log('Update data:', updateData);

    const strategies = await ragRerankingStrategyRepository.update(id, updateData);

    if (strategies.length === 0) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    return NextResponse.json({ strategy: strategies[0] });
  } catch (error: any) {
    if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') { // Unique violation
      return NextResponse.json(
        { error: 'A strategy with this name already exists' },
        { status: 400 }
      );
    }
    
    console.error('Failed to update reranking strategy:', error);
    return NextResponse.json(
      { error: 'Failed to update reranking strategy' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if it's the default strategy
    const strategy = await ragRerankingStrategyRepository.findById(id);
    if (strategy?.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default strategy' },
        { status: 400 }
      );
    }

    await ragRerankingStrategyRepository.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete reranking strategy:', error);
    return NextResponse.json(
      { error: 'Failed to delete reranking strategy' },
      { status: 500 }
    );
  }
}
