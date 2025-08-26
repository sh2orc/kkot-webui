import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  ragCollectionRepository, 
  ragDocumentRepository,
  ragDocumentChunkRepository
} from '@/lib/db/repository';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      sourceCollectionId, 
      newCollectionName,
      copyDocuments,
      copyVectors 
    } = body;

    // Validate input
    if (!sourceCollectionId || !newCollectionName?.trim()) {
      return NextResponse.json(
        { error: 'Source collection ID and new name are required' },
        { status: 400 }
      );
    }

    // Check if source collection exists
    const sourceCollection = await ragCollectionRepository.findById(sourceCollectionId);
    if (!sourceCollection) {
      return NextResponse.json(
        { error: 'Source collection not found' },
        { status: 404 }
      );
    }

    // Check if collection name already exists
    // Note: We'll let the database handle unique constraint

    // Create new collection
    const newCollection = await ragCollectionRepository.create({
      name: newCollectionName.trim(),
      description: `Copied from ${sourceCollection.name}`,
      vectorStoreId: sourceCollection.vectorStoreId,
      embeddingModel: sourceCollection.embeddingModel,
      isActive: true,
    });

    const newCollectionId = newCollection[0].id;
    let copiedDocuments = 0;
    let copiedVectors = 0;

    // Copy documents if requested
    if (copyDocuments) {
      const documents = await ragDocumentRepository.findByCollectionId(sourceCollectionId);
      
      for (const doc of documents) {
        const newDoc = await ragDocumentRepository.create({
          collectionId: newCollectionId,
          title: doc.title,
          filename: doc.filename,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          contentType: doc.contentType,
          content: doc.content,
          processingStatus: copyVectors ? 'completed' : 'pending',
        });

        copiedDocuments++;

        // Copy chunks if requested
        if (copyVectors && doc.processingStatus === 'completed') {
          const chunks = await ragDocumentChunkRepository.findByDocumentId(doc.id);
          
          if (chunks.length > 0) {
            await ragDocumentChunkRepository.createMany(
              chunks.map(chunk => ({
                documentId: newDoc[0].id,
                chunkIndex: chunk.chunkIndex,
                content: chunk.content,
                cleanedContent: chunk.cleanedContent,
                embeddingVector: chunk.embeddingVector,
                metadata: chunk.metadata,
                tokenCount: chunk.tokenCount,
              }))
            );
            copiedVectors += chunks.length;
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      collection: newCollection[0],
      stats: {
        documentsCopied: copiedDocuments,
        vectorsCopied: copiedVectors
      },
      message: `Collection "${newCollectionName}" created successfully` 
    });
  } catch (error: any) {
    console.error('Failed to copy collection:', error);
    
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'A collection with this name already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to copy collection' },
      { status: 500 }
    );
  }
}
