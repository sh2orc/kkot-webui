// RAG Collections API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db/config';
import { ragCollections, ragVectorStores } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

// GET /api/rag/collections - List all collections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const vectorStoreId = searchParams.get('vectorStoreId');

    const db = getDb();
    let query = db
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
      .innerJoin(ragVectorStores, eq(ragCollections.vectorStoreId, ragVectorStores.id));

    if (vectorStoreId) {
      query = query.where(eq(ragCollections.vectorStoreId, parseInt(vectorStoreId)));
    }

    const collections = await query;
    
    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

// POST /api/rag/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      vectorStoreId, 
      name, 
      description, 
      embeddingModel, 
      embeddingDimensions,
      metadata 
    } = body;

    // Validate required fields
    if (!vectorStoreId || !name) {
      return NextResponse.json(
        { error: 'Vector store ID and name are required' },
        { status: 400 }
      );
    }

    // Check if vector store exists and is enabled
    const vectorStore = await db
      .select()
      .from(ragVectorStores)
      .where(eq(ragVectorStores.id, vectorStoreId))
      .limit(1);

    if (vectorStore.length === 0) {
      return NextResponse.json(
        { error: 'Vector store not found' },
        { status: 404 }
      );
    }

    if (!vectorStore[0].enabled) {
      return NextResponse.json(
        { error: 'Vector store is disabled' },
        { status: 400 }
      );
    }

    // Create collection in vector store
    const config: VectorStoreConfig = {
      type: vectorStore[0].type as any,
      connectionString: vectorStore[0].connectionString,
      apiKey: vectorStore[0].apiKey,
      settings: vectorStore[0].settings ? JSON.parse(vectorStore[0].settings) : undefined,
    };

    try {
      const store = await VectorStoreFactory.create(config);
      await store.createCollection(
        name, 
        embeddingDimensions || 1536,
        metadata ? JSON.parse(metadata) : undefined
      );
      await store.disconnect();
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to create collection in vector store: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Create collection record in database
    const result = await db.insert(ragCollections).values({
      vectorStoreId,
      name,
      description,
      embeddingModel: embeddingModel || 'text-embedding-ada-002',
      embeddingDimensions: embeddingDimensions || 1536,
      metadata: metadata ? JSON.stringify(metadata) : null,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).returning();

    return NextResponse.json({ collection: result[0] });
  } catch (error) {
    console.error('Failed to create collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
