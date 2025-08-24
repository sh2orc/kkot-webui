// RAG Collections API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragCollectionRepository, ragVectorStoreRepository } from '@/lib/db/repository';
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

    const collections = await ragCollectionRepository.findAllWithVectorStore(
      vectorStoreId ? parseInt(vectorStoreId) : undefined
    );
    
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
    console.log('Collection creation request body:', body);
    
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
      console.log('Validation failed - missing required fields:', { vectorStoreId, name });
      return NextResponse.json(
        { error: 'Vector store ID and name are required' },
        { status: 400 }
      );
    }

    // Check if vector store exists and is enabled
    const vectorStore = await ragVectorStoreRepository.findById(vectorStoreId);

    if (!vectorStore) {
      console.log('Vector store not found:', vectorStoreId);
      return NextResponse.json(
        { error: 'Vector store not found' },
        { status: 404 }
      );
    }

    if (!vectorStore.enabled) {
      console.log('Vector store is disabled:', vectorStore);
      return NextResponse.json(
        { error: 'Vector store is disabled' },
        { status: 400 }
      );
    }

    // Create collection in vector store
    const config: VectorStoreConfig = {
      type: vectorStore.type as any,
      connectionString: vectorStore.connectionString,
      apiKey: vectorStore.apiKey,
      settings: vectorStore.settings ? JSON.parse(vectorStore.settings) : undefined,
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
    const result = await ragCollectionRepository.create({
      vectorStoreId,
      name,
      description,
      embeddingModel: embeddingModel || 'text-embedding-ada-002',
      embeddingDimensions: embeddingDimensions || 1536,
      metadata: metadata ? JSON.parse(metadata) : undefined,
      isActive: true,
    });

    return NextResponse.json({ collection: result[0] });
  } catch (error) {
    console.error('Failed to create collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
