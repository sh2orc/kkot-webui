// Cleansing configurations API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db/config';
import { ragCleansingConfigs, llmModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/rag/cleansing-configs - List all cleansing configurations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const configs = await db
      .select({
        id: ragCleansingConfigs.id,
        name: ragCleansingConfigs.name,
        llmModelId: ragCleansingConfigs.llmModelId,
        cleansingPrompt: ragCleansingConfigs.cleansingPrompt,
        removeHeaders: ragCleansingConfigs.removeHeaders,
        removeFooters: ragCleansingConfigs.removeFooters,
        removePageNumbers: ragCleansingConfigs.removePageNumbers,
        normalizeWhitespace: ragCleansingConfigs.normalizeWhitespace,
        fixEncoding: ragCleansingConfigs.fixEncoding,
        customRules: ragCleansingConfigs.customRules,
        isDefault: ragCleansingConfigs.isDefault,
        createdAt: ragCleansingConfigs.createdAt,
        updatedAt: ragCleansingConfigs.updatedAt,
        llmModelName: llmModels.modelId,
      })
      .from(ragCleansingConfigs)
      .leftJoin(llmModels, eq(ragCleansingConfigs.llmModelId, llmModels.id));
    
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Failed to fetch cleansing configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cleansing configs' },
      { status: 500 }
    );
  }
}

// POST /api/rag/cleansing-configs - Create a new cleansing configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      llmModelId,
      cleansingPrompt,
      removeHeaders,
      removeFooters,
      removePageNumbers,
      normalizeWhitespace,
      fixEncoding,
      customRules,
      isDefault,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // If LLM model is specified, verify it exists
    if (llmModelId) {
      const model = await db
        .select()
        .from(llmModels)
        .where(eq(llmModels.id, llmModelId))
        .limit(1);

      if (model.length === 0) {
        return NextResponse.json(
          { error: 'LLM model not found' },
          { status: 404 }
        );
      }
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db
        .update(ragCleansingConfigs)
        .set({ isDefault: false })
        .where(eq(ragCleansingConfigs.isDefault, true));
    }

    // Create the configuration
    const result = await db.insert(ragCleansingConfigs).values({
      name,
      llmModelId: llmModelId || null,
      cleansingPrompt,
      removeHeaders: removeHeaders ?? true,
      removeFooters: removeFooters ?? true,
      removePageNumbers: removePageNumbers ?? true,
      normalizeWhitespace: normalizeWhitespace ?? true,
      fixEncoding: fixEncoding ?? true,
      customRules: customRules ? JSON.stringify(customRules) : null,
      isDefault: isDefault || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).returning();

    return NextResponse.json({ config: result[0] });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'A configuration with this name already exists' },
        { status: 400 }
      );
    }
    
    console.error('Failed to create cleansing config:', error);
    return NextResponse.json(
      { error: 'Failed to create cleansing config' },
      { status: 500 }
    );
  }
}

// PUT /api/rag/cleansing-configs/[id] - Update a cleansing configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Config ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      llmModelId,
      cleansingPrompt,
      removeHeaders,
      removeFooters,
      removePageNumbers,
      normalizeWhitespace,
      fixEncoding,
      customRules,
      isDefault,
    } = body;

    const db = getDb();

    // If LLM model is specified, verify it exists
    if (llmModelId !== undefined && llmModelId !== null) {
      const model = await db
        .select()
        .from(llmModels)
        .where(eq(llmModels.id, llmModelId))
        .limit(1);

      if (model.length === 0) {
        return NextResponse.json(
          { error: 'LLM model not found' },
          { status: 404 }
        );
      }
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db
        .update(ragCleansingConfigs)
        .set({ isDefault: false })
        .where(eq(ragCleansingConfigs.isDefault, true));
    }

    // Update the configuration
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (name !== undefined) updateData.name = name;
    if (llmModelId !== undefined) updateData.llmModelId = llmModelId;
    if (cleansingPrompt !== undefined) updateData.cleansingPrompt = cleansingPrompt;
    if (removeHeaders !== undefined) updateData.removeHeaders = removeHeaders;
    if (removeFooters !== undefined) updateData.removeFooters = removeFooters;
    if (removePageNumbers !== undefined) updateData.removePageNumbers = removePageNumbers;
    if (normalizeWhitespace !== undefined) updateData.normalizeWhitespace = normalizeWhitespace;
    if (fixEncoding !== undefined) updateData.fixEncoding = fixEncoding;
    if (customRules !== undefined) updateData.customRules = JSON.stringify(customRules);
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const result = await db
      .update(ragCleansingConfigs)
      .set(updateData)
      .where(eq(ragCleansingConfigs.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ config: result[0] });
  } catch (error) {
    console.error('Failed to update cleansing config:', error);
    return NextResponse.json(
      { error: 'Failed to update cleansing config' },
      { status: 500 }
    );
  }
}

// DELETE /api/rag/cleansing-configs/[id] - Delete a cleansing configuration
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Config ID is required' }, { status: 400 });
    }

    const db = getDb();
    await db
      .delete(ragCleansingConfigs)
      .where(eq(ragCleansingConfigs.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete cleansing config:', error);
    return NextResponse.json(
      { error: 'Failed to delete cleansing config' },
      { status: 500 }
    );
  }
}