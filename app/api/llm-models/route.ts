import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { llmModelRepository, llmServerRepository } from '@/lib/db/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/app/api/auth/[...nextauth]/route';
import { filterResourcesByPermission, requireResourcePermission } from '@/lib/auth/permissions';

// GET: Retrieve LLM models
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const serverId = url.searchParams.get('serverId');
    const provider = url.searchParams.get('provider');
    const publicOnly = url.searchParams.get('publicOnly') === 'true';
    const embeddingOnly = url.searchParams.get('embeddingOnly') === 'true';
    const chatOnly = url.searchParams.get('chatOnly') === 'true';
    
    let models;
    
    if (serverId) {
      // For specific server, check if we need chat models only
      if (chatOnly) {
        models = await llmModelRepository.findChatModelsByServerIdWithServer(serverId);
      } else {
        models = await llmModelRepository.findByServerIdWithServer(serverId);
      }
    } else if (provider) {
      models = await llmModelRepository.findByProvider(provider);
    } else if (publicOnly && embeddingOnly) {
      models = await llmModelRepository.findPublicEmbeddingModels();
    } else if (publicOnly) {
      models = await llmModelRepository.findPublic(); // Already excludes embedding models
    } else if (chatOnly) {
      models = await llmModelRepository.findAllChatModelsWithServer();
    } else {
      models = await llmModelRepository.findAllWithServer();
    }
    
    // Parse capabilities
    const parsedModels = models.map((model: any) => ({
      ...model,
      capabilities: model.capabilities ? JSON.parse(model.capabilities) : null
    }));
    
    // Filter models based on user permissions
    const accessibleModels = await filterResourcesByPermission(
      parsedModels,
      'model',
      'read'
    );
    
    return NextResponse.json(accessibleModels);
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
    // Check authentication
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can sync or create models
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can manage models' },
        { status: 403 }
      );
    }

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
            
            // Check if it's a vLLM server (baseUrl contains vllm or port is 8000)
            const isVLLM = server.baseUrl.toLowerCase().includes('vllm') || 
                          server.baseUrl.includes(':8000') ||
                          server.name.toLowerCase().includes('vllm');
            
            if (isVLLM) {
              // For vLLM, retrieve all models
              models = data.data.map((model: any) => ({
                modelId: model.id,
                capabilities: {
                  chat: true, // All vLLM models support chat
                  image: false,
                  audio: false
                }
              }));
            } else {
              // For standard OpenAI, retrieve all models (same logic as page)
              models = data.data.map((model: any) => {
                // Check if it's an embedding model
                const isEmbeddingModel = model.id.includes('text-embedding') || model.id.includes('embedding');
                
                return {
                  modelId: model.id,
                  isEmbeddingModel,
                  capabilities: {
                    // Infer capabilities from model name (same logic as connection page)
                    // Embedding models should not have chat capability
                    chat: !isEmbeddingModel && (model.id.includes('gpt') || model.id.includes('llama') || model.id.includes('mistral') || model.id.includes('qwen') || !model.id.includes('dall-e') && !model.id.includes('whisper')),
                    image: model.id.includes('dall-e') || model.id.includes('vision') || model.id.includes('-VL'),
                    audio: model.id.includes('whisper') || model.id.includes('tts')
                  }
                };
              });
            }
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
            models = data.models?.map((model: any) => {
              // Check if it's an embedding model
              const isEmbeddingModel = model.name.includes('embedding') || model.name.includes('embed');
              
              return {
                modelId: model.name,
                isEmbeddingModel,
                capabilities: {
                  chat: !isEmbeddingModel, // Embedding models should not have chat capability
                  image: false,
                  audio: false
                },
                contextLength: model.details?.parameter_size
              };
            }) || [];
          }
        } catch (err) {
          console.error('Failed to retrieve Ollama models:', err);
        }
      }
      
      // Get Gemini models
      else if (server.provider === 'gemini' && server.apiKey) {
        try {
          const response = await fetch(`${server.baseUrl}/models?key=${server.apiKey}`);
          
          if (response.ok) {
            const data = await response.json();
            models = data.models?.map((model: any) => {
              const modelName = model.name.replace('models/', ''); // Remove 'models/' prefix
              // Check if it's an embedding model
              const isEmbeddingModel = modelName.includes('embedding') || modelName.includes('embed');
              
              return {
                modelId: modelName,
                isEmbeddingModel,
                capabilities: {
                  chat: !isEmbeddingModel, // Embedding models should not have chat capability
                  image: !isEmbeddingModel && model.supportedGenerationMethods?.includes('generateContent') && 
                         (model.inputTokenLimit > 100000 || model.name.includes('vision')), // Vision models typically have large context
                  audio: false // Currently no audio support in standard Gemini models
                },
                contextLength: model.inputTokenLimit
              };
            }) || [];
          }
        } catch (err) {
          console.error('Failed to retrieve Gemini models:', err);
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
          contextLength: model.contextLength,
          isEmbeddingModel: model.isEmbeddingModel || false
          // Not passing enabled and isPublic
          // - New models: Set to disabled(false) by default
          // - Existing models: Current state is preserved
        });
        results.push(result[0]);
      }
      
      // Invalidate page cache
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
    // Check authentication
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    console.log('🔧 Model update request:', { id, updateData });
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required.' },
        { status: 400 }
      );
    }

    // Check if user has write permission for this model
    const permissionCheck = await requireResourcePermission('model', id, 'write');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }
    
    console.log('🔧 Calling llmModelRepository.update with:', { id, updateData });
    const result = await llmModelRepository.update(id, updateData);
    console.log('🔧 Update result:', result);
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Model not found.' },
        { status: 404 }
      );
    }
    
    // Invalidate page cache
    revalidatePath('/admin/model');
    
    console.log('🔧 Model successfully updated:', result[0]);
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

// DELETE: Delete model
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required.' },
        { status: 400 }
      );
    }

    // Check if user has delete permission for this model
    const permissionCheck = await requireResourcePermission('model', id, 'delete');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }
    
    await llmModelRepository.delete(id);
    
    return NextResponse.json({
      message: 'Model has been deleted.'
    });
  } catch (error) {
    console.error('LLM model deletion error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting LLM model.' },
      { status: 500 }
    );
  }
} 