// RAG Documents API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ragDocuments, ragCollections, ragVectorStores, ragDocumentChunks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    let query = db
      .select({
        id: ragDocuments.id,
        collectionId: ragDocuments.collectionId,
        title: ragDocuments.title,
        filename: ragDocuments.filename,
        fileType: ragDocuments.fileType,
        fileSize: ragDocuments.fileSize,
        contentType: ragDocuments.contentType,
        processingStatus: ragDocuments.processingStatus,
        errorMessage: ragDocuments.errorMessage,
        createdAt: ragDocuments.createdAt,
        updatedAt: ragDocuments.updatedAt,
        collectionName: ragCollections.name,
      })
      .from(ragDocuments)
      .innerJoin(ragCollections, eq(ragDocuments.collectionId, ragCollections.id));

    if (collectionId) {
      query = query.where(eq(ragDocuments.collectionId, parseInt(collectionId)));
    }

    if (status) {
      query = query.where(eq(ragDocuments.processingStatus, status));
    }

    const documents = await query;
    
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
    const collection = await db
      .select()
      .from(ragCollections)
      .where(eq(ragCollections.id, parseInt(collectionId)))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (!collection[0].isActive) {
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

        const [document] = await db.insert(ragDocuments).values({
          collectionId: parseInt(collectionId),
          title: file.name,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileHash,
          contentType: getContentType(file.type),
          processingStatus: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }).returning();

        results.push({
          id: document.id,
          filename: file.name,
          status: 'pending'
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
    await db
      .update(ragDocuments)
      .set({ 
        processingStatus: 'processing',
        updatedAt: Date.now()
      })
      .where(eq(ragDocuments.id, documentId));

    // Get document and collection info
    const document = await db
      .select()
      .from(ragDocuments)
      .where(eq(ragDocuments.id, documentId))
      .limit(1);

    if (document.length === 0) return;

    const collection = await db
      .select()
      .from(ragCollections)
      .innerJoin(ragVectorStores, eq(ragCollections.vectorStoreId, ragVectorStores.id))
      .where(eq(ragCollections.id, document[0].collectionId))
      .limit(1);

    if (collection.length === 0) return;

    // Process document
    const processingService = new DocumentProcessingService();
    const processed = await processingService.processDocument(
      buffer,
      document[0].filename,
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

    // Update document with content
    await db
      .update(ragDocuments)
      .set({
        rawContent: processed.content,
        metadata: JSON.stringify(processed.metadata),
        updatedAt: Date.now(),
      })
      .where(eq(ragDocuments.id, documentId));

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

    // Generate embeddings
    const embeddingProvider = EmbeddingProviderFactory.create({
      provider: 'openai',
      model: collection[0].embeddingModel,
      apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
    });

    const textsToEmbed = chunks.map(c => c.cleanedContent || c.content);
    const embeddings = await embeddingProvider.generateEmbeddings(textsToEmbed);

    // Store in vector database
    const vectorStoreConfig = {
      type: collection[0].type as any,
      connectionString: collection[0].connectionString,
      apiKey: collection[0].apiKey,
      settings: collection[0].settings ? JSON.parse(collection[0].settings) : undefined,
    };

    const vectorStore = await VectorStoreFactory.create(vectorStoreConfig);
    
    const documentChunks = chunks.map((chunk, i) => ({
      id: `${documentId}_${i}`,
      documentId: documentId.toString(),
      chunkIndex: i,
      content: chunk.content,
      cleanedContent: chunk.cleanedContent,
      embedding: embeddings[i],
      metadata: {
        ...chunk.metadata,
        documentTitle: document[0].title,
        documentType: document[0].contentType,
      },
    }));

    await vectorStore.addDocuments(collection[0].name, documentChunks);
    await vectorStore.disconnect();

    // Store chunks in database
    await db.insert(ragDocumentChunks).values(
      documentChunks.map(chunk => ({
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        cleanedContent: chunk.cleanedContent,
        embeddingVector: JSON.stringify(chunk.embedding),
        metadata: JSON.stringify(chunk.metadata),
        tokenCount: chunk.content.split(/\s+/).length,
        createdAt: Date.now(),
      }))
    );

    // Update document status
    await db
      .update(ragDocuments)
      .set({
        processingStatus: 'completed',
        updatedAt: Date.now(),
      })
      .where(eq(ragDocuments.id, documentId));

  } catch (error) {
    console.error('Document processing failed:', error);
    
    // Update document with error
    await db
      .update(ragDocuments)
      .set({
        processingStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: Date.now(),
      })
      .where(eq(ragDocuments.id, documentId));
  }
}
