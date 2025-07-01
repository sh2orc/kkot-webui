import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { llmModelRepository, llmServerRepository } from '@/lib/db/server';

// GET: Retrieve LLM models
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const serverId = url.searchParams.get('serverId');
    const provider = url.searchParams.get('provider');
    const publicOnly = url.searchParams.get('publicOnly') === 'true';
    
    let models;
    
    if (serverId) {
      models = await llmModelRepository.findByServerIdWithServer(serverId);
    } else if (provider) {
      models = await llmModelRepository.findByProvider(provider);
    } else if (publicOnly) {
      models = await llmModelRepository.findPublic();
    } else {
      models = await llmModelRepository.findAllWithServer();
    }
    
    // Parse capabilities
    const parsedModels = models.map((model: any) => ({
      ...model,
      capabilities: model.capabilities ? JSON.parse(model.capabilities) : null
    }));
    
    return NextResponse.json(parsedModels);
  } catch (error) {
    console.error('Error retrieving LLM models:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving LLM models.' },
      { status: 500 }
    );
  }
}

// POST: Model synchronization (Get model list from OpenAI/Ollama API)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, action } = body;
    
    if (action === 'sync') {
      // Get server information
      const servers = await llmServerRepository.findById(serverId);
      if (!servers || servers.length === 0) {
        return NextResponse.json(
          { error: 'Server not found.' },
          { status: 404 }
        );
      }
      
      const server = servers[0];
      let models = [];
      
      // Get OpenAI models
      if (server.provider === 'openai' && server.apiKey) {
        try {
          const response = await fetch(`${server.baseUrl}/models`, {
            headers: {
              'Authorization': `Bearer ${server.apiKey}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            models = data.data.filter((model: any) => 
              model.id.includes('gpt') || model.id.includes('dall-e') || model.id.includes('whisper')
            ).map((model: any) => ({
              modelId: model.id,
              capabilities: {
                chat: model.id.includes('gpt'),
                image: model.id.includes('dall-e'),
                audio: model.id.includes('whisper')
              }
            }));
          }
        } catch (err) {
          console.error('Failed to retrieve OpenAI models:', err);
        }
      }
      
      // Get Ollama models
      else if (server.provider === 'ollama') {
        try {
          const response = await fetch(`${server.baseUrl}/api/tags`);
          
          if (response.ok) {
            const data = await response.json();
            models = data.models?.map((model: any) => ({
              modelId: model.name,
              capabilities: {
                chat: true,
                image: false,
                audio: false
              },
              contextLength: model.details?.parameter_size
            })) || [];
          }
        } catch (err) {
          console.error('Failed to retrieve Ollama models:', err);
        }
      }
      
      // Upsert models
      const results = [];
      for (const model of models) {
        const result = await llmModelRepository.upsert({
          serverId: server.id,
          modelId: model.modelId,
          provider: server.provider,
          capabilities: model.capabilities,
          contextLength: model.contextLength
          // Not passing enabled and isPublic
          // - New models: Set to disabled(false) by default
          // - Existing models: Current state is preserved
        });
        results.push(result[0]);
      }
      
      // 페이지 캐시 무효화
      revalidatePath('/admin/model');
      
      return NextResponse.json({
        message: 'Model synchronization complete',
        count: results.length,
        models: results
      });
    }
    
    // General create/update
    else {
      const result = await llmModelRepository.upsert(body);
      return NextResponse.json({
        message: 'Model has been saved.',
        data: result[0]
      });
    }
  } catch (error) {
    console.error('Error processing LLM model:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing LLM model.' },
      { status: 500 }
    );
  }
}

// PUT: Update model
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required.' },
        { status: 400 }
      );
    }
    
    const result = await llmModelRepository.update(id, updateData);
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Model not found.' },
        { status: 404 }
      );
    }
    
    // 페이지 캐시 무효화
    revalidatePath('/admin/model');
    
    return NextResponse.json({
      message: 'Model has been updated.',
      data: result[0]
    });
  } catch (error) {
    console.error('Error updating LLM model:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating LLM model.' },
      { status: 500 }
    );
  }
}

// DELETE: 모델 삭제
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'id는 필수입니다.' },
        { status: 400 }
      );
    }
    
    await llmModelRepository.delete(id);
    
    return NextResponse.json({
      message: '모델이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('LLM model deletion error:', error);
    return NextResponse.json(
      { error: 'LLM 모델을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 