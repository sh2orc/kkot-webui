// RAG Search API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ragCollections, ragVectorStores, ragDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
    const collection = await db
      .select()
      .from(ragCollections)
      .innerJoin(ragVectorStores, eq(ragCollections.vectorStoreId, ragVectorStores.id))
      .where(eq(ragCollections.id, collectionId))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const col = collection[0];

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
        
        const document = await db
          .select({
            id: ragDocuments.id,
            title: ragDocuments.title,
            filename: ragDocuments.filename,
            contentType: ragDocuments.contentType,
          })
          .from(ragDocuments)
          .where(eq(ragDocuments.id, documentId))
          .limit(1);

        return {
          ...result,
          document: document[0] || null,
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
