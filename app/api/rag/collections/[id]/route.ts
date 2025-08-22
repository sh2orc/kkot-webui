// Individual collection API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ragCollections, ragVectorStores, ragDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/rag/collections/[id] - Get a specific collection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collection = await db
      .select({
        id: ragCollections.id,
        vectorStoreId: ragCollections.vectorStoreId,
        name: ragCollections.name,
        description: ragCollections.description,
        embeddingModel: ragCollections.embeddingModel,
        embeddingDimensions: ragCollections.embeddingDimensions,
        metadata: ragCollections.metadata,
        isActive: ragCollections.isActive,
        createdAt: ragCollections.createdAt,
        updatedAt: ragCollections.updatedAt,
        vectorStoreName: ragVectorStores.name,
        vectorStoreType: ragVectorStores.type,
      })
      .from(ragCollections)
      .innerJoin(ragVectorStores, eq(ragCollections.vectorStoreId, ragVectorStores.id))
      .where(eq(ragCollections.id, parseInt(params.id)))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Get collection stats from vector store
    const vectorStore = await db
      .select()
      .from(ragVectorStores)
      .where(eq(ragVectorStores.id, collection[0].vectorStoreId))
      .limit(1);

    if (vectorStore.length > 0 && vectorStore[0].enabled) {
      try {
        const config: VectorStoreConfig = {
          type: vectorStore[0].type as any,
          connectionString: vectorStore[0].connectionString,
          apiKey: vectorStore[0].apiKey,
          settings: vectorStore[0].settings ? JSON.parse(vectorStore[0].settings) : undefined,
        };

        const store = await VectorStoreFactory.create(config);
        const stats = await store.getCollectionStats(collection[0].name);
        await store.disconnect();

        return NextResponse.json({ 
          collection: {
            ...collection[0],
            stats
          }
        });
      } catch (error) {
        console.error('Failed to get collection stats:', error);
      }
    }

    return NextResponse.json({ collection: collection[0] });
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
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, metadata, isActive } = body;

    // Check if collection exists
    const existing = await db
      .select()
      .from(ragCollections)
      .where(eq(ragCollections.id, parseInt(params.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Update the collection
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (description !== undefined) updateData.description = description;
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await db
      .update(ragCollections)
      .set(updateData)
      .where(eq(ragCollections.id, parseInt(params.id)))
      .returning();

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
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get collection details
    const collection = await db
      .select()
      .from(ragCollections)
      .where(eq(ragCollections.id, parseInt(params.id)))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if any documents exist in this collection
    const documents = await db
      .select({ count: db.count() })
      .from(ragDocuments)
      .where(eq(ragDocuments.collectionId, parseInt(params.id)));

    if (documents[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete collection with existing documents' },
        { status: 400 }
      );
    }

    // Get vector store config
    const vectorStore = await db
      .select()
      .from(ragVectorStores)
      .where(eq(ragVectorStores.id, collection[0].vectorStoreId))
      .limit(1);

    if (vectorStore.length > 0 && vectorStore[0].enabled) {
      // Delete collection from vector store
      try {
        const config: VectorStoreConfig = {
          type: vectorStore[0].type as any,
          connectionString: vectorStore[0].connectionString,
          apiKey: vectorStore[0].apiKey,
          settings: vectorStore[0].settings ? JSON.parse(vectorStore[0].settings) : undefined,
        };

        const store = await VectorStoreFactory.create(config);
        await store.deleteCollection(collection[0].name);
        await store.disconnect();
      } catch (error) {
        console.error('Failed to delete collection from vector store:', error);
        // Continue with database deletion even if vector store deletion fails
      }
    }

    // Delete from database
    await db
      .delete(ragCollections)
      .where(eq(ragCollections.id, parseInt(params.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
