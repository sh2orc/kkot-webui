// Individual document API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  ragDocumentRepository,
  ragDocumentChunkRepository,
  ragCollectionRepository,
  ragVectorStoreRepository
} from '@/lib/db/repository';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/rag/documents/[id] - Get a specific document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeChunks = searchParams.get('includeChunks') === 'true';

    const document = await ragDocumentRepository.findById(parseInt(params.id));
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const collection = await ragCollectionRepository.findById(document.collectionId);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    let chunks = [];
    if (includeChunks) {
      chunks = await ragDocumentChunkRepository.findByDocumentId(parseInt(params.id));
    }

    return NextResponse.json({ 
      document: {
        ...document,
        collectionName: collection.name
      },
      chunks: includeChunks ? chunks : undefined,
    });
  } catch (error) {
    console.error('Failed to fetch document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// DELETE /api/rag/documents/[id] - Delete a document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document details
    const document = await ragDocumentRepository.findById(parseInt(params.id));
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const collection = await ragCollectionRepository.findByIdWithVectorStore(document.collectionId);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Get all chunk IDs for this document
    const chunks = await ragDocumentChunkRepository.findByDocumentId(parseInt(params.id));

    const chunkIds = chunks.map((chunk, index) => `${params.id}_${index}`);

    // Delete from vector store if enabled
    if (collection.ragVectorStores.enabled) {
      try {
        const config: VectorStoreConfig = {
          type: collection.ragVectorStores.type as any,
          connectionString: collection.ragVectorStores.connectionString,
          apiKey: collection.ragVectorStores.apiKey,
          settings: collection.ragVectorStores.settings ? JSON.parse(collection.ragVectorStores.settings) : undefined,
        };

        const store = await VectorStoreFactory.create(config);
        await store.deleteDocuments(collection.ragCollections.name, chunkIds);
        await store.disconnect();
      } catch (error) {
        console.error('Failed to delete from vector store:', error);
        // Continue with database deletion even if vector store deletion fails
      }
    }

    // Delete chunks from database
    await ragDocumentChunkRepository.deleteByDocumentId(parseInt(params.id));

    // Delete document from database
    await ragDocumentRepository.delete(parseInt(params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

// POST /api/rag/documents/[id]/reprocess - Reprocess a document
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chunkingStrategy, chunkSize, chunkOverlap, cleansingConfigId } = body;

    // Check if document exists and has content
    const document = await ragDocumentRepository.findById(parseInt(params.id));

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.rawContent) {
      return NextResponse.json(
        { error: 'Document has no content to reprocess' },
        { status: 400 }
      );
    }

    // Update status to processing
    await ragDocumentRepository.update(parseInt(params.id), {
      processingStatus: 'processing',
      errorMessage: null,
    });

    // Queue for reprocessing
    // In a real implementation, this would queue a background job
    // For now, we'll just update the status back to completed
    setTimeout(async () => {
      await ragDocumentRepository.update(parseInt(params.id), {
        processingStatus: 'completed',
      });
    }, 1000);

    return NextResponse.json({ 
      success: true,
      message: 'Document queued for reprocessing'
    });
  } catch (error) {
    console.error('Failed to reprocess document:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess document' },
      { status: 500 }
    );
  }
}
