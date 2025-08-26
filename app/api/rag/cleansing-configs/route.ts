// Cleansing configurations API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragCleansingConfigRepository, llmModelRepository } from '@/lib/db/repository';

// GET /api/rag/cleansing-configs - List all cleansing configurations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await ragCleansingConfigRepository.findAllWithModel();
    
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

    // If LLM model is specified, verify it exists
    if (llmModelId) {
      const model = await llmModelRepository.findById(llmModelId);

      if (!model || model.length === 0) {
        return NextResponse.json(
          { error: 'LLM model not found' },
          { status: 404 }
        );
      }
    }

    // Create the configuration
    const result = await ragCleansingConfigRepository.create({
      name,
      llmModelId: llmModelId || null,
      cleansingPrompt,
      removeHeaders: removeHeaders ?? true,
      removeFooters: removeFooters ?? true,
      removePageNumbers: removePageNumbers ?? true,
      normalizeWhitespace: normalizeWhitespace ?? true,
      fixEncoding: fixEncoding ?? true,
      customRules,
      isDefault: isDefault || false,
    });

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

