// RAG Search API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  ragCollectionRepository,
  ragDocumentRepository 
} from '@/lib/db/repository';
import { llmModelRepository, llmServerRepository } from '@/lib/db/repository/llm';
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
    
    console.log('Search request params:', { 
      collectionId, 
      collectionIdType: typeof collectionId,
      query, 
      queryLength: query?.length,
      topK, 
      filter 
    });

    // Validate inputs
    if (!query) {
      console.log('Parameter validation failed:', { hasQuery: !!query });
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // If collectionId is "all" or not provided, search in all active collections
    let collections: any[] = [];
    
    if (!collectionId || collectionId === 'all') {
      console.log('Searching in all active collections');
      
      // First get all active collections
      const activeCollections = await ragCollectionRepository.findActive();
      console.log(`Found ${activeCollections.length} active collections`);
      
      // Then fetch each collection with vector store info
      for (const collection of activeCollections) {
        const colWithVectorStore = await ragCollectionRepository.findByIdWithVectorStore(collection.id);
        if (colWithVectorStore && colWithVectorStore.ragVectorStores.enabled) {
          collections.push(colWithVectorStore);
        }
      }
      
      console.log(`${collections.length} collections have enabled vector stores`);
      
      if (collections.length === 0) {
        return NextResponse.json(
          { error: 'No active collections with enabled vector stores found' },
          { status: 400 }
        );
      }
    } else {
      // Get specific collection
      const col = await ragCollectionRepository.findByIdWithVectorStore(collectionId);
      console.log('Collection data:', col);

      if (!col) {
        console.log('Collection not found for ID:', collectionId);
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      if (!col.ragCollections.isActive) {
        console.log('Collection is not active:', col.ragCollections.isActive);
        return NextResponse.json(
          { error: 'Collection is not active' },
          { status: 400 }
        );
      }

      if (!col.ragVectorStores.enabled) {
        console.log('Vector store is disabled:', col.ragVectorStores.enabled);
        return NextResponse.json(
          { error: 'Vector store is disabled' },
          { status: 400 }
        );
      }
      
      collections = [col];
    }

    // Search in collections
    let allResults: any[] = [];
    
    for (const col of collections) {
      console.log(`Searching in collection: ${col.ragCollections.name}`);
      
      // Find the embedding model and its server information
      const embeddingModels = await llmModelRepository.findAllWithServer();
      console.log('Available embedding models:', embeddingModels.filter((m: any) => m.isEmbeddingModel === 1));
      console.log('Looking for embedding model:', col.ragCollections.embeddingModel);
      
      const embeddingModel = embeddingModels.find((model: any) => 
        model.modelId === col.ragCollections.embeddingModel && 
        model.isEmbeddingModel === 1
      );
      console.log('Found embedding model:', embeddingModel);

      // Get embedding provider - first try to find registered model, then fallback to provider-based lookup
      let embeddingProvider;
      
      if (!embeddingModel || !embeddingModel.serverId) {
        console.log('Embedding model not registered, looking for OpenAI provider server');
        
        // Find OpenAI provider server as fallback
        const openaiServers = await llmServerRepository.findByProvider('openai');
        console.log('OpenAI servers details:', openaiServers.map((s: any) => ({ 
          name: s.name, 
          enabled: s.enabled, 
          enabledType: typeof s.enabled,
          hasApiKey: !!s.apiKey 
        })));
        
        const activeOpenaiServer = openaiServers.find((server: any) => 
          server.enabled === 1 || server.enabled === true || server.enabled === '1'
        );
        
        console.log('Found OpenAI servers:', openaiServers.length, 'Active:', !!activeOpenaiServer);
        
        if (!activeOpenaiServer || !activeOpenaiServer.apiKey) {
          console.log(`Skipping collection ${col.ragCollections.name} - no embedding provider available`);
          continue; // Skip this collection and continue with next
        }
        
        console.log('Using OpenAI server fallback:', activeOpenaiServer.name);
        
        embeddingProvider = EmbeddingProviderFactory.create({
          provider: 'openai',
          model: col.ragCollections.embeddingModel,
          apiKey: activeOpenaiServer.apiKey,
          baseUrl: activeOpenaiServer.baseUrl,
        });
      } else {
        // Get the server information for the embedding model
        const serverResult = await llmServerRepository.findById(embeddingModel.serverId);
        const server = serverResult?.[0];
        console.log('Found registered embedding model server:', server);

        if (!server || !server.apiKey) {
          console.log('Server validation failed:', { server: !!server, apiKey: !!server?.apiKey });
          console.log(`Skipping collection ${col.ragCollections.name} - no valid server`);
          continue; // Skip this collection and continue with next
        }

        // Generate embedding for query
        embeddingProvider = EmbeddingProviderFactory.create({
          provider: embeddingModel.provider,
          model: embeddingModel.modelId,
          apiKey: server.apiKey,
          baseUrl: server.baseUrl,
        });
      }

      try {
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
        
        // Add collection info to results
        const resultsWithCollection = results.map(result => ({
          ...result,
          collectionId: col.ragCollections.id,
          collectionName: col.ragCollections.name
        }));
        
        allResults.push(...resultsWithCollection);
        console.log(`Found ${results.length} results in collection ${col.ragCollections.name}`);
      } catch (error) {
        console.error(`Error searching in collection ${col.ragCollections.name}:`, error);
        // Continue with next collection even if this one fails
      }
    }
    
    // If no results found in any collection
    if (allResults.length === 0) {
      return NextResponse.json({
        results: [],
        query,
        collectionId: collectionId || 'all',
        message: 'No results found in any collection'
      });
    }
    
    // Sort all results by score and limit to topK
    allResults.sort((a, b) => b.score - a.score);
    allResults = allResults.slice(0, topK);

    // Enrich results with document information and filter out orphaned chunks
    const enrichedResults = await Promise.all(
      allResults.map(async (result) => {
        const documentId = parseInt(result.metadata?.documentId || result.documentId);
        
        if (!documentId || isNaN(documentId)) {
          console.warn('Invalid documentId in search result:', result.metadata?.documentId || result.documentId);
          return null;
        }
        
        const document = await ragDocumentRepository.findById(documentId);

        // If document doesn't exist, filter out this result
        if (!document) {
          console.log(`Document ${documentId} not found, filtering out orphaned chunk`);
          return null;
        }

        return {
          ...result,
          document: {
            id: document.id,
            title: document.title,
            filename: document.filename,
            contentType: document.contentType,
          },
        };
      })
    );
    
    // Filter out null results (orphaned chunks)
    const validResults = enrichedResults.filter(result => result !== null);

    return NextResponse.json({ 
      results: validResults,
      query,
      collectionId: collectionId || 'all',
    });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
