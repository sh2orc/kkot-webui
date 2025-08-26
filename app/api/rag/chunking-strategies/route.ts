// Chunking strategies API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragChunkingStrategyRepository } from '@/lib/db/repository';
import { ChunkingStrategyFactory } from '@/lib/rag/document';

// GET /api/rag/chunking-strategies - List all chunking strategies
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const strategies = await ragChunkingStrategyRepository.findAll();
    
    // Add available types that can be used
    const availableTypes = ChunkingStrategyFactory.getAvailableStrategies();
    
    return NextResponse.json({ 
      strategies,
      availableTypes,
    });
  } catch (error) {
    console.error('Failed to fetch chunking strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chunking strategies' },
      { status: 500 }
    );
  }
}

// POST /api/rag/chunking-strategies - Create a new chunking strategy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, chunkSize, chunkOverlap, separator, customRules, isDefault } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    const availableTypes = ChunkingStrategyFactory.getAvailableStrategies();
    if (!availableTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid chunking strategy type. Available types: ${availableTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create the strategy
    const result = await ragChunkingStrategyRepository.create({
      name,
      type,
      chunkSize: chunkSize || 1000,
      chunkOverlap: chunkOverlap || 200,
      separator,
      customRules,
      isDefault: isDefault || false,
    });

    return NextResponse.json({ strategy: result[0] });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'A strategy with this name already exists' },
        { status: 400 }
      );
    }
    
    console.error('Failed to create chunking strategy:', error);
    return NextResponse.json(
      { error: 'Failed to create chunking strategy' },
      { status: 500 }
    );
  }
}


