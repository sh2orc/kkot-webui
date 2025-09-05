// RAG Collections Sync API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ragCollectionRepository, ragVectorStoreRepository } from '@/lib/db/repository';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

// POST /api/rag/collections/sync - Sync collections between vector store and database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can sync collections
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can sync collections' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { vectorStoreId } = body;

    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Vector store ID is required' },
        { status: 400 }
      );
    }

    // Get vector store configuration
    const vectorStore = await ragVectorStoreRepository.findById(vectorStoreId);
    if (!vectorStore) {
      return NextResponse.json(
        { error: 'Vector store not found' },
        { status: 404 }
      );
    }

    if (!vectorStore.enabled) {
      return NextResponse.json(
        { error: 'Vector store is disabled' },
        { status: 400 }
      );
    }

    // Connect to vector store
    const config: VectorStoreConfig = {
      type: vectorStore.type as any,
      connectionString: vectorStore.connectionString,
      apiKey: vectorStore.apiKey,
      settings: vectorStore.settings ? JSON.parse(vectorStore.settings) : undefined,
    };

    let store;
    try {
      store = await VectorStoreFactory.create(config);
      
      // Get collections from vector store
      const vectorStoreCollections = await store.listCollections();
      
      // Get collections from database
      const dbCollections = await ragCollectionRepository.findByVectorStoreId(vectorStoreId);
      
      // Find collections that exist in vector store but not in database
      const missingInDb = vectorStoreCollections.filter(
        vectorCol => !dbCollections.find(dbCol => dbCol.name === vectorCol.name)
      );
      
      // Find collections that exist in database but not in vector store
      const missingInVectorStore = dbCollections.filter(
        dbCol => !vectorStoreCollections.find(vectorCol => vectorCol.name === dbCol.name)
      );
      
      const syncResults = {
        addedToDb: [] as any[],
        removedFromDb: [] as any[],
        errors: [] as string[]
      };
      
      // Add missing collections to database
      for (const vectorCol of missingInDb) {
        try {
          const result = await ragCollectionRepository.create({
            vectorStoreId,
            name: vectorCol.name,
            description: vectorCol.description || `Synced from vector store`,
            embeddingModel: 'text-embedding-ada-002', // Default, can be updated later
            embeddingDimensions: 1536, // Default, can be updated later
            defaultChunkingStrategyId: null,
            defaultCleansingConfigId: null,
            defaultRerankingStrategyId: null,
            metadata: vectorCol.metadata,
            isActive: true,
          });
          syncResults.addedToDb.push(result[0]);
        } catch (error) {
          console.error(`Failed to add collection ${vectorCol.name} to database:`, error);
          syncResults.errors.push(`Failed to add collection ${vectorCol.name} to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Optionally mark database collections as inactive if they don't exist in vector store
      // (instead of deleting them to preserve metadata)
      for (const dbCol of missingInVectorStore) {
        try {
          if (dbCol.isActive) {
            await ragCollectionRepository.update(dbCol.id!, {
              isActive: false
            });
            syncResults.removedFromDb.push({
              id: dbCol.id,
              name: dbCol.name,
              action: 'deactivated'
            });
          }
        } catch (error) {
          console.error(`Failed to deactivate collection ${dbCol.name}:`, error);
          syncResults.errors.push(`Failed to deactivate collection ${dbCol.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      await store.disconnect();
      
      return NextResponse.json({
        message: 'Collections synchronized successfully',
        results: syncResults,
        summary: {
          vectorStoreCollections: vectorStoreCollections.length,
          dbCollections: dbCollections.length,
          addedToDb: syncResults.addedToDb.length,
          deactivatedInDb: syncResults.removedFromDb.length,
          errors: syncResults.errors.length
        }
      });
      
    } catch (error) {
      console.error('Vector store sync operation failed:', error);
      
      if (store) {
        try {
          await store.disconnect();
        } catch (disconnectError) {
          console.warn('Failed to disconnect from vector store:', disconnectError);
        }
      }
      
      let errorMessage = 'Failed to sync collections';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          troubleshooting: 'Vector store connection or sync operation failed. Please check the server logs for more details.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Failed to sync collections:', error);
    
    let errorMessage = 'Failed to sync collections';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        troubleshooting: 'An unexpected error occurred during sync. Please check the server logs for more details.'
      },
      { status: 500 }
    );
  }
}

// GET /api/rag/collections/sync - Check sync status between vector store and database
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can check sync status
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can check sync status' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const vectorStoreId = searchParams.get('vectorStoreId');

    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Vector store ID is required' },
        { status: 400 }
      );
    }

    // Get vector store configuration
    const vectorStore = await ragVectorStoreRepository.findById(parseInt(vectorStoreId));
    if (!vectorStore) {
      return NextResponse.json(
        { error: 'Vector store not found' },
        { status: 404 }
      );
    }

    if (!vectorStore.enabled) {
      return NextResponse.json(
        { error: 'Vector store is disabled' },
        { status: 400 }
      );
    }

    // Connect to vector store
    const config: VectorStoreConfig = {
      type: vectorStore.type as any,
      connectionString: vectorStore.connectionString,
      apiKey: vectorStore.apiKey,
      settings: vectorStore.settings ? JSON.parse(vectorStore.settings) : undefined,
    };

    let store;
    try {
      store = await VectorStoreFactory.create(config);
      
      // Get collections from both sources
      const vectorStoreCollections = await store.listCollections();
      const dbCollections = await ragCollectionRepository.findByVectorStoreId(parseInt(vectorStoreId));
      
      // Find differences
      const missingInDb = vectorStoreCollections.filter(
        vectorCol => !dbCollections.find(dbCol => dbCol.name === vectorCol.name)
      );
      
      const missingInVectorStore = dbCollections.filter(
        dbCol => !vectorStoreCollections.find(vectorCol => vectorCol.name === dbCol.name) && dbCol.isActive
      );
      
      const synced = dbCollections.filter(
        dbCol => vectorStoreCollections.find(vectorCol => vectorCol.name === dbCol.name)
      );
      
      await store.disconnect();
      
      return NextResponse.json({
        vectorStore: {
          id: vectorStore.id,
          name: vectorStore.name,
          type: vectorStore.type
        },
        status: {
          totalVectorStoreCollections: vectorStoreCollections.length,
          totalDbCollections: dbCollections.length,
          syncedCollections: synced.length,
          missingInDb: missingInDb.length,
          missingInVectorStore: missingInVectorStore.length,
          isSynced: missingInDb.length === 0 && missingInVectorStore.length === 0
        },
        details: {
          vectorStoreCollections: vectorStoreCollections.map(c => ({ name: c.name, description: c.description })),
          dbCollections: dbCollections.map(c => ({ name: c.name, description: c.description, isActive: c.isActive })),
          missingInDb: missingInDb.map(c => ({ name: c.name, description: c.description })),
          missingInVectorStore: missingInVectorStore.map(c => ({ name: c.name, description: c.description }))
        }
      });
      
    } catch (error) {
      console.error('Vector store sync check failed:', error);
      
      if (store) {
        try {
          await store.disconnect();
        } catch (disconnectError) {
          console.warn('Failed to disconnect from vector store:', disconnectError);
        }
      }
      
      let errorMessage = 'Failed to check sync status';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          troubleshooting: 'Vector store connection failed. Please check if the vector store service is running.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Failed to check sync status:', error);
    
    let errorMessage = 'Failed to check sync status';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        troubleshooting: 'An unexpected error occurred. Please check the server logs for more details.'
      },
      { status: 500 }
    );
  }
}
