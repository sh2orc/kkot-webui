// RAG Documents API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  ragDocumentRepository, 
  ragDocumentChunkRepository, 
  ragCollectionRepository,
  ragVectorStoreRepository,
  llmModelRepository,
  llmServerRepository 
} from '@/lib/db/repository';

// GET /api/rag/documents - List documents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get('collectionId');
    const status = searchParams.get('status');

    const documents = await ragDocumentRepository.findAllWithCollection(
      collectionId ? parseInt(collectionId) : undefined,
      status || undefined
    );
    
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/rag/documents - Upload and process documents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const collectionId = formData.get('collectionId') as string;
    const chunkingStrategy = formData.get('chunkingStrategy') as string || 'fixed_size';
    const chunkSize = parseInt(formData.get('chunkSize') as string || '1000');
    const chunkOverlap = parseInt(formData.get('chunkOverlap') as string || '200');
    const cleansingConfigId = formData.get('cleansingConfigId') as string;
    const files = formData.getAll('files') as File[];

    if (!collectionId) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Check if collection exists and is active
    const collection = await ragCollectionRepository.findById(parseInt(collectionId));

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (!collection.isActive) {
      return NextResponse.json(
        { error: 'Collection is not active' },
        { status: 400 }
      );
    }

    // Process each file
    const results = [];
    for (const file of files) {
      try {
        // Create document record
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileHash = require('crypto').createHash('sha256').update(buffer).digest('hex');

        const [document] = await ragDocumentRepository.create({
          collectionId: parseInt(collectionId),
          title: file.name,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileHash,
          contentType: getContentType(file.type),
          processingStatus: 'pending',
        });

        results.push({
          id: document.id,
          filename: file.name,
          status: 'pending'
        });

        // Log file details before processing
        console.log('Processing document:', {
          id: document.id,
          filename: file.name,
          type: file.type,
          size: file.size,
          bufferSize: buffer.length,
          firstBytes: buffer.slice(0, 10).toString('hex')
        });
        
        // Queue document for processing
        // In a real implementation, this would queue a background job
        processDocumentAsync(document.id, buffer, file.type, {
          chunkingStrategy,
          chunkSize,
          chunkOverlap,
          cleansingConfigId,
          collectionId: parseInt(collectionId),
        });

      } catch (error) {
        console.error(`Failed to upload document ${file.name}:`, error);
        results.push({
          filename: file.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Failed to upload documents:', error);
    return NextResponse.json(
      { error: 'Failed to upload documents' },
      { status: 500 }
    );
  }
}

function getContentType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/markdown': 'markdown',
    'text/csv': 'csv',
    'application/json': 'json',
  };
  return typeMap[mimeType] || 'unknown';
}

// Async document processing (simplified - in production this would be a proper job queue)
async function processDocumentAsync(
  documentId: number,
  buffer: Buffer,
  mimeType: string,
  options: any
) {
  try {
    // Import processing modules
    const { DocumentProcessingService } = await import('@/lib/rag/document');
    const { CleansingService } = await import('@/lib/rag/cleansing');
    const { VectorStoreFactory, EmbeddingProviderFactory } = await import('@/lib/rag');

    // Update status to processing
    await ragDocumentRepository.update(documentId, {
      processingStatus: 'processing'
    });

    // Get document and collection info
    const document = await ragDocumentRepository.findById(documentId);

    if (!document) return;

    const collection = await ragCollectionRepository.findById(document.collectionId);

    if (!collection) return;
    
    const vectorStore = await ragVectorStoreRepository.findById(collection.vectorStoreId);
    
    if (!vectorStore) {
      console.error('Vector store not found for collection:', collection.id);
      return;
    }

    // Process document
    const processingService = new DocumentProcessingService();
    const processed = await processingService.processDocument(
      buffer,
      document.filename,
      mimeType,
      {
        chunkingStrategy: options.chunkingStrategy,
        chunkingOptions: {
          chunkSize: options.chunkSize,
          chunkOverlap: options.chunkOverlap,
        },
        extractMetadata: true,
      }
    );

    // Update document with content and metadata
    await ragDocumentRepository.update(documentId, {
      rawContent: processed.content,
      metadata: JSON.stringify({
        ...(processed.metadata ? (typeof processed.metadata === 'string' ? JSON.parse(processed.metadata) : processed.metadata) : {}),
        processingConfig: {
          chunkingStrategy: options.chunkingStrategy,
          chunkSize: options.chunkSize,
          chunkOverlap: options.chunkOverlap,
          cleansingConfigId: options.cleansingConfigId
        }
      })
    });

    // Apply cleansing if configured
    let chunks = processed.chunks;
    if (options.cleansingConfigId) {
      const cleansingService = new CleansingService({ useLLM: true });
      const cleanedChunks = await cleansingService.cleanseDocumentChunks(
        chunks.map(c => ({ content: c.content })),
        undefined,
        options.cleansingConfigId
      );
      chunks = chunks.map((chunk, i) => ({
        ...chunk,
        cleanedContent: cleanedChunks[i].cleanedContent,
      }));
    }

    // Check if chunks is empty
    if (!chunks || chunks.length === 0) {
      console.error('No chunks generated for document:', {
        documentId,
        filename: document.filename,
        contentLength: processed.content?.length || 0,
        mimeType
      });
      throw new Error('Document processing resulted in no chunks. The document may be empty or unsupported.');
    }

    // Find the embedding model and its server
    const allEmbeddingModels = await llmModelRepository.findPublicEmbeddingModels();
    const embeddingModel = allEmbeddingModels.find((m: any) => m.modelId === collection.embeddingModel);
    
    let embeddingApiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
    let embeddingProvider = 'openai';
    let embeddingBaseUrl: string | undefined;
    
    if (embeddingModel) {
      const server = await llmServerRepository.findById(embeddingModel.serverId);
      
      if (server && server.length > 0) {
        embeddingApiKey = server[0].apiKey || embeddingApiKey;
        embeddingProvider = server[0].provider;
        embeddingBaseUrl = server[0].baseUrl;
        console.log(`Using embedding model ${collection.embeddingModel} from server ${server[0].name}`);
      }
    } else {
      console.warn(`Embedding model ${collection.embeddingModel} not found in registered models, using default API key`);
    }
    
    // Generate embeddings
    const embeddingProviderInstance = EmbeddingProviderFactory.create({
      provider: embeddingProvider as 'openai' | 'gemini' | 'ollama' | 'custom',
      model: collection.embeddingModel,
      apiKey: embeddingApiKey,
      baseUrl: embeddingBaseUrl,
    });

    const textsToEmbed = chunks.map((c: any) => c.cleanedContent || c.content);
    const embeddings = await embeddingProviderInstance.generateEmbeddings(textsToEmbed);

    // Prepare document chunks for storage
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

    // Store chunks in database first (this is more reliable)
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

    // Try to store in vector database (with error handling)
    let vectorStoreSuccess = false;
    try {
      const vectorStoreConfig = {
        type: vectorStore.type as any,
        connectionString: vectorStore.connectionString,
        apiKey: vectorStore.apiKey,
        settings: vectorStore.settings ? JSON.parse(vectorStore.settings) : undefined,
      };

      const store = await VectorStoreFactory.create(vectorStoreConfig);
      await store.addDocuments(collection.name, documentChunks);
      await store.disconnect();
      vectorStoreSuccess = true;
      console.log(`Document ${documentId} successfully stored in vector database`);
    } catch (vectorError) {
      console.error(`Failed to store document ${documentId} in vector database:`, vectorError);
      // Continue processing - chunks are stored in database even if vector store fails
    }

    // Update document status (always execute this)
    console.log(`Updating document ${documentId} status to completed...`);
    const updateResult = await ragDocumentRepository.update(documentId, {
      processingStatus: 'completed',
      metadata: JSON.stringify({
        ...(document.metadata ? (typeof document.metadata === 'string' ? JSON.parse(document.metadata) : document.metadata) : {}),
        processingConfig: {
          chunkingStrategy: options.chunkingStrategy,
          chunkSize: options.chunkSize,
          chunkOverlap: options.chunkOverlap,
          cleansingConfigId: options.cleansingConfigId
        },
        vectorStoreSuccess
      })
    });
    
    console.log(`Document ${documentId} status update result:`, updateResult);
    
    // Verify the update by fetching the document again
    const updatedDocument = await ragDocumentRepository.findById(documentId);
    console.log(`Document ${documentId} current status in DB:`, updatedDocument?.processingStatus);

    console.log(`Document ${documentId} processing completed successfully`);

  } catch (error) {
    console.error('Document processing failed:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        documentId,
        fileSize: buffer?.length,
        mimeType,
        options
      });
    }
    
    // Update document with error
    await ragDocumentRepository.update(documentId, {
      processingStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
