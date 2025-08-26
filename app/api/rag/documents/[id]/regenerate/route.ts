import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  ragDocumentRepository, 
  ragDocumentChunkRepository,
  ragCollectionRepository,
  ragChunkingStrategyRepository,
  ragCleansingConfigRepository,
  ragVectorStoreRepository
} from '@/lib/db/repository';
// Remove this import - we'll process inline like the upload API

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await request.json();
    const { 
      collectionId, 
      chunkingStrategyId, 
      cleansingConfigId,
      deleteOriginal 
    } = body;

    if (!collectionId) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // Fetch the original document
    const document = await ragDocumentRepository.findById(parseInt(documentId));
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify target collection exists
    const collection = await ragCollectionRepository.findById(collectionId);
    if (!collection) {
      return NextResponse.json(
        { error: 'Target collection not found' },
        { status: 404 }
      );
    }

    // Get chunking strategy (use provided or default)
    let chunkingStrategy;
    if (chunkingStrategyId) {
      chunkingStrategy = await ragChunkingStrategyRepository.findById(chunkingStrategyId);
    } else {
      chunkingStrategy = await ragChunkingStrategyRepository.findDefault();
    }

    if (!chunkingStrategy) {
      return NextResponse.json(
        { error: 'No chunking strategy available' },
        { status: 400 }
      );
    }

    // Get cleansing config (use provided or default)
    let cleansingConfig;
    if (cleansingConfigId) {
      cleansingConfig = await ragCleansingConfigRepository.findById(cleansingConfigId);
    } else {
      cleansingConfig = await ragCleansingConfigRepository.findDefault();
    }

    // Get document content - reconstruct from chunks if needed
    let documentContent = document.content || document.rawContent;
    
    if (!documentContent) {
      // Try to reconstruct from chunks
      const chunks = await ragDocumentChunkRepository.findByDocumentId(parseInt(documentId));
      if (chunks && chunks.length > 0) {
        // Sort by chunk index and concatenate
        documentContent = chunks
          .sort((a: any, b: any) => a.chunkIndex - b.chunkIndex)
          .map((chunk: any) => chunk.content)
          .join('\n\n');
      }
    }

    if (!documentContent) {
      return NextResponse.json(
        { error: 'No content found for document' },
        { status: 400 }
      );
    }

    // Create new document entry
    const newDocument = await ragDocumentRepository.create({
      collectionId,
      title: document.title,
      filename: `regenerated_${document.filename}`,
      fileType: document.fileType,
      fileSize: document.fileSize,
      fileHash: document.fileHash || require('crypto').createHash('sha256').update(documentContent).digest('hex'),
      contentType: document.contentType,
      rawContent: documentContent,
      processingStatus: 'pending',
      metadata: JSON.stringify({
        processingConfig: {
          chunkingStrategyId: chunkingStrategyId || null,
          cleansingConfigId: cleansingConfigId || null
        }
      })
    });

    // Delete original document if requested
    if (deleteOriginal) {
      // Delete chunks associated with original document
      await ragDocumentChunkRepository.deleteByDocumentId(parseInt(documentId));
      // Delete the original document
      await ragDocumentRepository.delete(parseInt(documentId));
    }

    // Queue document for processing (simplified version - in production use job queue)
    processDocumentAsync(
      newDocument[0].id,
      documentContent,
      chunkingStrategy,
      cleansingConfig
    ).catch(error => {
      console.error('Failed to process document:', error);
    });

    return NextResponse.json({ 
      success: true, 
      documentId: newDocument[0].id,
      message: 'Document regeneration started' 
    });
  } catch (error) {
    console.error('Failed to regenerate document:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate document' },
      { status: 500 }
    );
  }
}

// Async document processing function
async function processDocumentAsync(
  documentId: number,
  content: string | Buffer,
  chunkingStrategy: any,
  cleansingConfig: any
) {
  try {
    // Update status to processing
    await ragDocumentRepository.update(documentId, {
      processingStatus: 'processing'
    });

    // Get document and collection info
    const document = await ragDocumentRepository.findById(documentId);
    if (!document) return;

    const collectionWithStore = await ragCollectionRepository.findByIdWithVectorStore(document.collectionId);
    if (!collectionWithStore) return;
    
    // Extract collection and vector store from join result
    const collection = collectionWithStore.ragCollections;
    const vectorStore = collectionWithStore.ragVectorStores;
    
    // Import necessary modules
    const { ChunkingStrategyFactory } = await import('@/lib/rag/document');
    const { CleansingService } = await import('@/lib/rag/cleansing');
    const { VectorStoreFactory, EmbeddingProviderFactory } = await import('@/lib/rag');

    // Convert content to string if it's a Buffer
    const textContent = typeof content === 'string' ? content : content.toString();

    // Create chunking strategy instance
    const chunkingStrategyInstance = ChunkingStrategyFactory.create(
      chunkingStrategy.type as any,
      {
        chunkSize: chunkingStrategy.chunkSize,
        chunkOverlap: chunkingStrategy.chunkOverlap,
      }
    );

    // Chunk the document
    let chunks = await chunkingStrategyInstance.chunk(textContent, {
      chunkSize: chunkingStrategy.chunkSize,
      chunkOverlap: chunkingStrategy.chunkOverlap,
    });

    // Apply cleansing if configured
    if (cleansingConfig) {
      const cleansingService = new CleansingService({ useLLM: !!cleansingConfig.llmModelId });
      const cleanedChunks = await cleansingService.cleanseDocumentChunks(
        chunks.map((chunk: any) => ({ content: chunk.content })),
        {
          removeHeaders: cleansingConfig.removeHeaders,
          removeFooters: cleansingConfig.removeFooters,
          removePageNumbers: cleansingConfig.removePageNumbers,
          normalizeWhitespace: cleansingConfig.normalizeWhitespace,
          fixEncoding: cleansingConfig.fixEncoding,
        },
        cleansingConfig.id.toString()
      );
      chunks = chunks.map((chunk: any, i: number) => ({
        ...chunk,
        cleanedContent: cleanedChunks[i].cleanedContent
      }));
    }

    // Generate embeddings
    const embeddingProviderInstance = EmbeddingProviderFactory.create({
      provider: 'openai',
      model: collection.embeddingModel || 'text-embedding-ada-002',
    });

    const textsToEmbed = chunks.map((chunk: any) => chunk.cleanedContent || chunk.content);
    const embeddings = await embeddingProviderInstance.generateEmbeddings(textsToEmbed);

    // Store in vector database
    const vectorStoreConfig = {
      type: vectorStore.type as any,
      connectionString: vectorStore.connectionString,
      apiKey: vectorStore.apiKey,
      settings: vectorStore.settings ? JSON.parse(vectorStore.settings) : undefined,
    };

    const store = await VectorStoreFactory.create(vectorStoreConfig);
    
    const documentChunks = chunks.map((chunk: any, i) => ({
      id: `${documentId}_${i}`,
      documentId: documentId.toString(),
      chunkIndex: i,
      content: chunk.content,
      cleanedContent: chunk.cleanedContent,
      embedding: embeddings[i],
      metadata: {
        ...chunk.metadata,
        documentTitle: document.title,
        documentType: document.contentType,
      },
    }));

    await store.addDocuments(collection.name, documentChunks);
    await store.disconnect();

    // Store chunks in database
    await ragDocumentChunkRepository.createMany(
      documentChunks.map(chunk => ({
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        cleanedContent: chunk.cleanedContent,
        embeddingVector: JSON.stringify(chunk.embedding),
        metadata: chunk.metadata,
        tokenCount: chunk.content.split(/\s+/).length,
      }))
    );

    // Update document status
    await ragDocumentRepository.update(documentId, {
      processingStatus: 'completed'
    });

  } catch (error) {
    console.error('Document processing failed:', error);
    
    // Update document with error
    await ragDocumentRepository.update(documentId, {
      processingStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
