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
      defaultChunkingStrategyId,
      defaultCleansingConfigId,
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
      console.log('Creating vector store with config:', { type: config.type, connectionString: config.connectionString?.substring(0, 20) + '...' });
      const store = await VectorStoreFactory.create(config);
      console.log('Vector store created successfully, creating collection...');
      await store.createCollection(
        name, 
        embeddingDimensions || 1536,
        metadata ? JSON.parse(metadata) : undefined
      );
      console.log('Collection created in vector store successfully');
      await store.disconnect();
    } catch (error) {
      console.error('Vector store operation failed:', error);
      
      let errorMessage = 'Failed to create collection in vector store';
      let troubleshooting = '';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        
        // Add specific troubleshooting based on error type
        if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
          troubleshooting = 'Vector store connection failed. Please check if the vector store service is running.';
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          troubleshooting = 'Authentication failed. Please check your API key or credentials.';
        } else if (error.message.includes('already exists')) {
          troubleshooting = 'Collection already exists. Please use a different name.';
        } else if (error.message.includes('invalid') || error.message.includes('validation')) {
          troubleshooting = 'Invalid parameters. Please check your input values.';
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          troubleshooting: troubleshooting || undefined
        },
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
      defaultChunkingStrategyId: defaultChunkingStrategyId || null,
      defaultCleansingConfigId: defaultCleansingConfigId || null,
      metadata: metadata ? JSON.parse(metadata) : undefined,
      isActive: true,
    });

    return NextResponse.json({ collection: result[0] });
  } catch (error) {
    console.error('Failed to create collection:', error);
    
    let errorMessage = 'Failed to create collection';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        troubleshooting: 'An unexpected error occurred. Please check the server logs for more details.'
      },
      { status: 500 }
    );
  }
}
