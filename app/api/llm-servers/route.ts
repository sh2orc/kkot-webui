import { NextRequest, NextResponse } from 'next/server';
import { llmServerRepository } from '@/lib/db/server';

// GET: Retrieve all LLM server settings
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const provider = url.searchParams.get('provider');
    const enabled = url.searchParams.get('enabled');

    if (id) {
      // Query by specific ID
      const server = await llmServerRepository.findById(id);
      if (server && server.length > 0) {
        const result = server[0];
        return NextResponse.json({
          ...result,
          models: result.models ? JSON.parse(result.models) : [],
          settings: result.settings ? JSON.parse(result.settings) : {}
        });
      }
      return NextResponse.json({ message: 'LLM server not found.', id }, { status: 404 });
    } else if (provider) {
      // Query by specific provider
      const servers = await llmServerRepository.findByProvider(provider);
      return NextResponse.json(servers.map(server => ({
        ...server,
        models: server.models ? JSON.parse(server.models) : [],
        settings: server.settings ? JSON.parse(server.settings) : {}
      })));
    } else if (enabled === 'true') {
      // Query only enabled servers
      const servers = await llmServerRepository.findEnabled();
      return NextResponse.json(servers.map(server => ({
        ...server,
        models: server.models ? JSON.parse(server.models) : [],
        settings: server.settings ? JSON.parse(server.settings) : {}
      })));
    } else {
      // Query all servers
      const servers = await llmServerRepository.findAll();
      return NextResponse.json(servers.map(server => ({
        ...server,
        models: server.models ? JSON.parse(server.models) : [],
        settings: server.settings ? JSON.parse(server.settings) : {}
      })));
    }
  } catch (error) {
    console.error('LLM server query error:', error);
    return NextResponse.json(
      { error: 'An error occurred while querying LLM servers.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Add new LLM server
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.provider || !body.name || !body.baseUrl) {
      return NextResponse.json(
        { error: 'provider, name, baseUrl are required.' },
        { status: 400 }
      );
    }

    // Create server
    const result = await llmServerRepository.create({
      provider: body.provider,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      models: body.models,
      enabled: body.enabled,
      isDefault: body.isDefault,
      settings: body.settings
    });
    
    return NextResponse.json({
      message: 'LLM server has been added.',
      data: {
        ...result[0],
        models: result[0].models ? JSON.parse(result[0].models) : [],
        settings: result[0].settings ? JSON.parse(result[0].settings) : {}
      }
    });
  } catch (error) {
    console.error('LLM server addition error:', error);
    return NextResponse.json(
      { error: 'An error occurred while adding LLM server.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT: Update LLM server
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'id is required.' },
        { status: 400 }
      );
    }

    // Update server
    const result = await llmServerRepository.update(body.id, {
      provider: body.provider,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      models: body.models,
      enabled: body.enabled,
      isDefault: body.isDefault,
      settings: body.settings
    });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'LLM server not found.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'LLM server has been updated.',
      data: {
        ...result[0],
        models: result[0].models ? JSON.parse(result[0].models) : [],
        settings: result[0].settings ? JSON.parse(result[0].settings) : {}
      }
    });
  } catch (error) {
    console.error('LLM server update error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating LLM server.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete LLM server
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required.' },
        { status: 400 }
      );
    }

    await llmServerRepository.delete(id);
    
    return NextResponse.json({
      message: 'LLM server has been deleted.'
    });
  } catch (error) {
    console.error('LLM server deletion error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting LLM server.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 