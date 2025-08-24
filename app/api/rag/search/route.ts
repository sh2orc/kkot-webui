// RAG Search API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  ragCollectionRepository,
  ragDocumentRepository 
} from '@/lib/db/repository';
import { VectorStoreFactory, VectorStoreConfig, EmbeddingProviderFactory } from '@/lib/rag';

// POST /api/rag/search - Search in a collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { collectionId, query, topK = 10, filter } = body;

    // Validate inputs
    if (!collectionId || !query) {
      return NextResponse.json(
        { error: 'Collection ID and query are required' },
        { status: 400 }
      );
    }

    // Get collection and vector store info
    const col = await ragCollectionRepository.findByIdWithVectorStore(collectionId);

    if (!col) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (!col.ragCollections.isActive) {
      return NextResponse.json(
        { error: 'Collection is not active' },
        { status: 400 }
      );
    }

    if (!col.ragVectorStores.enabled) {
      return NextResponse.json(
        { error: 'Vector store is disabled' },
        { status: 400 }
      );
    }

    // Generate embedding for query
    const embeddingProvider = EmbeddingProviderFactory.create({
      provider: 'openai',
      model: col.ragCollections.embeddingModel,
      apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
    });

    const queryEmbedding = await embeddingProvider.generateEmbedding(query);

    // Search in vector store
    const config: VectorStoreConfig = {
      type: col.ragVectorStores.type as any,
      connectionString: col.ragVectorStores.connectionString,
      apiKey: col.ragVectorStores.apiKey,
      settings: col.ragVectorStores.settings ? JSON.parse(col.ragVectorStores.settings) : undefined,
    };

    const store = await VectorStoreFactory.create(config);
    const results = await store.search(
      col.ragCollections.name,
      queryEmbedding,
      topK,
      filter
    );
    await store.disconnect();

    // Enrich results with document information
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const documentId = parseInt(result.metadata?.documentId || result.documentId);
        
        const document = await ragDocumentRepository.findById(documentId);

        return {
          ...result,
          document: document ? {
            id: document.id,
            title: document.title,
            filename: document.filename,
            contentType: document.contentType,
          } : null,
        };
      })
    );

    return NextResponse.json({ 
      results: enrichedResults,
      query,
      collectionId,
    });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
