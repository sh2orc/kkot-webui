import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragChunkingStrategyRepository } from '@/lib/db/repository';

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
    const { name, type, chunkSize, chunkOverlap } = body;
    
    console.log('Update request for strategy ID:', id);
    console.log('Request body:', body);

    if (!name || !type || !chunkSize || !chunkOverlap) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updateData = {
      name,
      type,
      chunkSize: parseInt(chunkSize),
      chunkOverlap: parseInt(chunkOverlap),
    };
    
    console.log('Update data:', updateData);

    const strategies = await ragChunkingStrategyRepository.update(id, updateData);

    if (strategies.length === 0) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    return NextResponse.json({ strategy: strategies[0] });
  } catch (error) {
    console.error('Failed to update chunking strategy:', error);
    return NextResponse.json(
      { error: 'Failed to update chunking strategy' },
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
    const strategy = await ragChunkingStrategyRepository.findById(id);
    if (strategy?.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default strategy' },
        { status: 400 }
      );
    }

    await ragChunkingStrategyRepository.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chunking strategy:', error);
    return NextResponse.json(
      { error: 'Failed to delete chunking strategy' },
      { status: 500 }
    );
  }
}
