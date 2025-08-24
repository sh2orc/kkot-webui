// Vector stores API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragVectorStoreRepository } from '@/lib/db/repository';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

// GET /api/rag/vector-stores - List all vector stores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stores = await ragVectorStoreRepository.findAll();
    
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Failed to fetch vector stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vector stores' },
      { status: 500 }
    );
  }
}

// POST /api/rag/vector-stores - Create a new vector store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, connectionString, apiKey, settings, enabled, isDefault } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['chromadb', 'pgvector', 'faiss'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid vector store type' },
        { status: 400 }
      );
    }

    // Test connection before saving
    const config: VectorStoreConfig = {
      type,
      connectionString,
      apiKey,
      settings: settings ? JSON.parse(settings) : undefined,
    };

    try {
      const store = await VectorStoreFactory.create(config);
      await store.disconnect();
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: `the vector store conneciton failed: ${errorMessage}`,
          troubleshooting: "the vector DB connection failed" || undefined
        },
        { status: 400 }
      );
    }

    // Create the vector store record
    const result = await ragVectorStoreRepository.create({
      name,
      type,
      connectionString,
      apiKey,
      settings: settings ? JSON.stringify(settings) : null,
      enabled: enabled ?? true,
      isDefault: isDefault ?? false,
    });

    return NextResponse.json({ store: result[0] });
  } catch (error) {
    console.error('Failed to create vector store:', error);
    return NextResponse.json(
      { error: 'Failed to create vector store' },
      { status: 500 }
    );
  }
}
