import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragCleansingConfigRepository } from '@/lib/db/repository';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      llmModelId,
      removeHeaders,
      removeFooters,
      removePageNumbers,
      normalizeWhitespace,
      fixEncoding,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const configs = await ragCleansingConfigRepository.update(id, {
      name,
      llmModelId: llmModelId || null,
      removeHeaders: removeHeaders ?? true,
      removeFooters: removeFooters ?? true,
      removePageNumbers: removePageNumbers ?? true,
      normalizeWhitespace: normalizeWhitespace ?? true,
      fixEncoding: fixEncoding ?? true,
    });

    if (configs.length === 0) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({ config: configs[0] });
  } catch (error) {
    console.error('Failed to update cleansing config:', error);
    return NextResponse.json(
      { error: 'Failed to update cleansing config' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if it's the default config
    const config = await ragCleansingConfigRepository.findById(id);
    if (config?.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default config' },
        { status: 400 }
      );
    }

    await ragCleansingConfigRepository.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete cleansing config:', error);
    return NextResponse.json(
      { error: 'Failed to delete cleansing config' },
      { status: 500 }
    );
  }
}
