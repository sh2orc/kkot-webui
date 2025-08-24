// Individual vector store API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragVectorStoreRepository, ragCollectionRepository } from '@/lib/db/repository';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/rag/vector-stores/[id] - Get a specific vector store
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await ragVectorStoreRepository.findById(parseInt(params.id));

    if (!store) {
      return NextResponse.json({ error: 'Vector store not found' }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error('Failed to fetch vector store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vector store' },
      { status: 500 }
    );
  }
}

// PUT /api/rag/vector-stores/[id] - Update a vector store
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, connectionString, apiKey, settings, enabled, isDefault } = body;

    // Check if store exists
    const existing = await ragVectorStoreRepository.findById(parseInt(params.id));

    if (!existing) {
      return NextResponse.json({ error: 'Vector store not found' }, { status: 404 });
    }

    // Test connection if connection details changed
    if (connectionString !== undefined || apiKey !== undefined) {
      const config: VectorStoreConfig = {
        type: existing.type as any,
        connectionString: connectionString ?? existing.connectionString,
        apiKey: apiKey ?? existing.apiKey,
        settings: settings ? JSON.parse(settings) : existing.settings,
      };

      try {
        const store = await VectorStoreFactory.create(config);
        await store.disconnect();
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to connect to vector store: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // Update the vector store
    const result = await ragVectorStoreRepository.update(parseInt(params.id), {
      name,
      connectionString,
      apiKey,
      settings,
      enabled,
      isDefault,
    });

    return NextResponse.json({ store: result[0] });
  } catch (error) {
    console.error('Failed to update vector store:', error);
    return NextResponse.json(
      { error: 'Failed to update vector store' },
      { status: 500 }
    );
  }
}

// DELETE /api/rag/vector-stores/[id] - Delete a vector store
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if any collections use this vector store
    const collections = await ragCollectionRepository.findByVectorStoreId(parseInt(params.id));

    if (collections.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vector store with existing collections' },
        { status: 400 }
      );
    }

    await ragVectorStoreRepository.delete(parseInt(params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete vector store:', error);
    return NextResponse.json(
      { error: 'Failed to delete vector store' },
      { status: 500 }
    );
  }
}
