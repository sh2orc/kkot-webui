// Individual vector store API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ragVectorStores, ragCollections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/rag/vector-stores/[id] - Get a specific vector store
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await db
      .select()
      .from(ragVectorStores)
      .where(eq(ragVectorStores.id, parseInt(params.id)))
      .limit(1);

    if (store.length === 0) {
      return NextResponse.json({ error: 'Vector store not found' }, { status: 404 });
    }

    return NextResponse.json({ store: store[0] });
  } catch (error) {
    console.error('Failed to fetch vector store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vector store' },
      { status: 500 }
    );
  }
}

// PUT /api/rag/vector-stores/[id] - Update a vector store
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, connectionString, apiKey, settings, enabled, isDefault } = body;

    // Check if store exists
    const existing = await db
      .select()
      .from(ragVectorStores)
      .where(eq(ragVectorStores.id, parseInt(params.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Vector store not found' }, { status: 404 });
    }

    // Test connection if connection details changed
    if (connectionString !== undefined || apiKey !== undefined) {
      const config: VectorStoreConfig = {
        type: existing[0].type as any,
        connectionString: connectionString ?? existing[0].connectionString,
        apiKey: apiKey ?? existing[0].apiKey,
        settings: settings ? JSON.parse(settings) : existing[0].settings,
      };

      try {
        const store = await VectorStoreFactory.create(config);
        await store.disconnect();
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to connect to vector store: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db
        .update(ragVectorStores)
        .set({ isDefault: false })
        .where(eq(ragVectorStores.isDefault, true));
    }

    // Update the vector store
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (name !== undefined) updateData.name = name;
    if (connectionString !== undefined) updateData.connectionString = connectionString;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (settings !== undefined) updateData.settings = JSON.stringify(settings);
    if (enabled !== undefined) updateData.enabled = enabled;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const result = await db
      .update(ragVectorStores)
      .set(updateData)
      .where(eq(ragVectorStores.id, parseInt(params.id)))
      .returning();

    return NextResponse.json({ store: result[0] });
  } catch (error) {
    console.error('Failed to update vector store:', error);
    return NextResponse.json(
      { error: 'Failed to update vector store' },
      { status: 500 }
    );
  }
}

// DELETE /api/rag/vector-stores/[id] - Delete a vector store
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if any collections use this vector store
    const collections = await db.query.ragCollections.findMany({
      where: eq(ragCollections.vectorStoreId, parseInt(params.id)),
    });

    if (collections.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vector store with existing collections' },
        { status: 400 }
      );
    }

    await db
      .delete(ragVectorStores)
      .where(eq(ragVectorStores.id, parseInt(params.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete vector store:', error);
    return NextResponse.json(
      { error: 'Failed to delete vector store' },
      { status: 500 }
    );
  }
}
