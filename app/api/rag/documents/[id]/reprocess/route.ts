// Reprocess document API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  ragDocumentRepository, 
  ragDocumentChunkRepository,
  ragCollectionRepository 
} from '@/lib/db/repository';

// POST /api/rag/documents/[id]/reprocess - Reprocess a failed document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const documentId = parseInt(id);
    
    // Get document
    const document = await ragDocumentRepository.findById(documentId);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Check if document failed
    if (document.processingStatus !== 'failed') {
      return NextResponse.json(
        { error: 'Document is not in failed state' },
        { status: 400 }
      );
    }
    
    // Get collection to ensure it's still active
    const collection = await ragCollectionRepository.findById(document.collectionId);
    
    if (!collection || !collection.isActive) {
      return NextResponse.json(
        { error: 'Collection is not active' },
        { status: 400 }
      );
    }
    
    // Clear existing chunks
    await ragDocumentChunkRepository.deleteByDocumentId(documentId);
    
    // Reset document status
    await ragDocumentRepository.update(documentId, {
      processingStatus: 'pending',
      errorMessage: null,
      rawContent: null,
      metadata: null
    });
    
    // Re-read file if possible (in real implementation, you'd need to store/retrieve the original file)
    // For now, we'll just return success and let the user re-upload
    
    return NextResponse.json({ 
      message: 'Document queued for reprocessing. Please re-upload the file.' 
    });
    
  } catch (error) {
    console.error('Failed to reprocess document:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess document' },
      { status: 500 }
    );
  }
}
