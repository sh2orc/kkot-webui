// Individual collection API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { 
  ragCollectionRepository, 
  ragVectorStoreRepository, 
  ragDocumentRepository 
} from '@/lib/db/repository';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';
import { requireResourcePermission } from '@/lib/auth/permissions';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/rag/collections/[id] - Get a specific collection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has read permission for this collection
    const permissionCheck = await requireResourcePermission('rag_collection', params.id, 'read');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    const collection = await ragCollectionRepository.findByIdWithVectorStore(parseInt(params.id));

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Get collection stats from vector store
    const vectorStore = await ragVectorStoreRepository.findById(collection.ragCollections.vectorStoreId);

    if (vectorStore && vectorStore.enabled) {
      try {
        const config: VectorStoreConfig = {
          type: vectorStore.type as any,
          connectionString: vectorStore.connectionString,
          apiKey: vectorStore.apiKey,
          settings: vectorStore.settings ? JSON.parse(vectorStore.settings) : undefined,
        };

        const store = await VectorStoreFactory.create(config);
        const stats = await store.getCollectionStats(collection.ragCollections.name);
        await store.disconnect();

        return NextResponse.json({ 
          collection: {
            ...collection.ragCollections,
            vectorStoreName: collection.ragVectorStores.name,
            vectorStoreType: collection.ragVectorStores.type,
            stats
          }
        });
      } catch (error) {
        console.error('Failed to get collection stats:', error);
      }
    }

    return NextResponse.json({ 
      collection: {
        ...collection.ragCollections,
        vectorStoreName: collection.ragVectorStores.name,
        vectorStoreType: collection.ragVectorStores.type
      }
    });
  } catch (error) {
    console.error('Failed to fetch collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

// PUT /api/rag/collections/[id] - Update a collection
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has write permission for this collection
    const permissionCheck = await requireResourcePermission('rag_collection', params.id, 'write');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { description, metadata, isActive, defaultChunkingStrategyId, defaultCleansingConfigId, defaultRerankingStrategyId } = body;

    // Check if collection exists
    const existing = await ragCollectionRepository.findById(parseInt(params.id));

    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Update the collection
    const result = await ragCollectionRepository.update(parseInt(params.id), {
      description,
      metadata,
      isActive,
      defaultChunkingStrategyId,
      defaultCleansingConfigId,
      defaultRerankingStrategyId,
    });

    return NextResponse.json({ collection: result[0] });
  } catch (error) {
    console.error('Failed to update collection:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

// DELETE /api/rag/collections/[id] - Delete a collection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has delete permission for this collection
    const permissionCheck = await requireResourcePermission('rag_collection', params.id, 'delete');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    // Get collection details
    const collection = await ragCollectionRepository.findById(parseInt(params.id));

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if any documents exist in this collection
    const documents = await ragDocumentRepository.findByCollectionId(parseInt(params.id));

    if (documents.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete collection with existing documents' },
        { status: 400 }
      );
    }

    // Get vector store config
    const vectorStore = await ragVectorStoreRepository.findById(collection.vectorStoreId);

    if (vectorStore && vectorStore.enabled) {
      // Delete collection from vector store
      try {
        const config: VectorStoreConfig = {
          type: vectorStore.type as any,
          connectionString: vectorStore.connectionString,
          apiKey: vectorStore.apiKey,
          settings: vectorStore.settings ? JSON.parse(vectorStore.settings) : undefined,
        };

        const store = await VectorStoreFactory.create(config);
        await store.deleteCollection(collection.name);
        await store.disconnect();
      } catch (error) {
        console.error('Failed to delete collection from vector store:', error);
        // Continue with database deletion even if vector store deletion fails
      }
    }

    // Delete from database
    await ragCollectionRepository.delete(parseInt(params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
