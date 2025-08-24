// Vector stores API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db/config';
import { ragVectorStores } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

// GET /api/rag/vector-stores - List all vector stores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const stores = await db.select().from(ragVectorStores);
    
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Failed to fetch vector stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vector stores' },
      { status: 500 }
    );
  }
}

// POST /api/rag/vector-stores - Create a new vector store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, connectionString, apiKey, settings, enabled, isDefault } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['chromadb', 'pgvector', 'faiss'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid vector store type' },
        { status: 400 }
      );
    }

    // Test connection before saving
    const config: VectorStoreConfig = {
      type,
      connectionString,
      apiKey,
      settings: settings ? JSON.parse(settings) : undefined,
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

    // If this is set as default, unset other defaults
    const db = getDb();
    if (isDefault) {
      await db
        .update(ragVectorStores)
        .set({ isDefault: false })
        .where(eq(ragVectorStores.isDefault, true));
    }

    // Create the vector store record
    const result = await db.insert(ragVectorStores).values({
      name,
      type,
      connectionString,
      apiKey,
      settings: settings ? JSON.stringify(settings) : null,
      enabled: enabled ?? true,
      isDefault: isDefault ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).returning();

    return NextResponse.json({ store: result[0] });
  } catch (error) {
    console.error('Failed to create vector store:', error);
    return NextResponse.json(
      { error: 'Failed to create vector store' },
      { status: 500 }
    );
  }
}
