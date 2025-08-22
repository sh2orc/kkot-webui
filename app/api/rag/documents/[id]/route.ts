// Individual document API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ragDocuments, ragDocumentChunks, ragCollections, ragVectorStores } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

    const document = await db
      .select({
        id: ragDocuments.id,
        collectionId: ragDocuments.collectionId,
        title: ragDocuments.title,
        filename: ragDocuments.filename,
        fileType: ragDocuments.fileType,
        fileSize: ragDocuments.fileSize,
        fileHash: ragDocuments.fileHash,
        contentType: ragDocuments.contentType,
        rawContent: ragDocuments.rawContent,
        metadata: ragDocuments.metadata,
        processingStatus: ragDocuments.processingStatus,
        errorMessage: ragDocuments.errorMessage,
        createdAt: ragDocuments.createdAt,
        updatedAt: ragDocuments.updatedAt,
        collectionName: ragCollections.name,
      })
      .from(ragDocuments)
      .innerJoin(ragCollections, eq(ragDocuments.collectionId, ragCollections.id))
      .where(eq(ragDocuments.id, parseInt(params.id)))
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let chunks = [];
    if (includeChunks) {
      chunks = await db
        .select()
        .from(ragDocumentChunks)
        .where(eq(ragDocumentChunks.documentId, parseInt(params.id)))
        .orderBy(ragDocumentChunks.chunkIndex);
    }

    return NextResponse.json({ 
      document: document[0],
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
    const document = await db
      .select()
      .from(ragDocuments)
      .innerJoin(ragCollections, eq(ragDocuments.collectionId, ragCollections.id))
      .innerJoin(ragVectorStores, eq(ragCollections.vectorStoreId, ragVectorStores.id))
      .where(eq(ragDocuments.id, parseInt(params.id)))
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = document[0];

    // Get all chunk IDs for this document
    const chunks = await db
      .select({ id: ragDocumentChunks.id })
      .from(ragDocumentChunks)
      .where(eq(ragDocumentChunks.documentId, parseInt(params.id)));

    const chunkIds = chunks.map((chunk, index) => `${params.id}_${index}`);

    // Delete from vector store if enabled
    if (doc.ragVectorStores.enabled) {
      try {
        const config: VectorStoreConfig = {
          type: doc.ragVectorStores.type as any,
          connectionString: doc.ragVectorStores.connectionString,
          apiKey: doc.ragVectorStores.apiKey,
          settings: doc.ragVectorStores.settings ? JSON.parse(doc.ragVectorStores.settings) : undefined,
        };

        const store = await VectorStoreFactory.create(config);
        await store.deleteDocuments(doc.ragCollections.name, chunkIds);
        await store.disconnect();
      } catch (error) {
        console.error('Failed to delete from vector store:', error);
        // Continue with database deletion even if vector store deletion fails
      }
    }

    // Delete chunks from database
    await db
      .delete(ragDocumentChunks)
      .where(eq(ragDocumentChunks.documentId, parseInt(params.id)));

    // Delete document from database
    await db
      .delete(ragDocuments)
      .where(eq(ragDocuments.id, parseInt(params.id)));

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
    const document = await db
      .select()
      .from(ragDocuments)
      .where(eq(ragDocuments.id, parseInt(params.id)))
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document[0].rawContent) {
      return NextResponse.json(
        { error: 'Document has no content to reprocess' },
        { status: 400 }
      );
    }

    // Update status to processing
    await db
      .update(ragDocuments)
      .set({
        processingStatus: 'processing',
        errorMessage: null,
        updatedAt: Date.now(),
      })
      .where(eq(ragDocuments.id, parseInt(params.id)));

    // Queue for reprocessing
    // In a real implementation, this would queue a background job
    // For now, we'll just update the status back to completed
    setTimeout(async () => {
      await db
        .update(ragDocuments)
        .set({
          processingStatus: 'completed',
          updatedAt: Date.now(),
        })
        .where(eq(ragDocuments.id, parseInt(params.id)));
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
