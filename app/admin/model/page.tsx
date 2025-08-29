import { llmServerRepository, llmModelRepository } from "@/lib/db/server"
import ModelManagementForm from "./model-management-form"

// OpenAI model lookup function
async function fetchOpenAIModels(server: any) {
  if (!server.apiKey) return [];
  
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
        return data.data.map((model: any) => {
          return {
            modelId: model.id,
            supportsMultimodal: false, // For vLLM, default to false, manual setting if needed
            capabilities: {
              chat: true, // All vLLM models support chat
              image: false,
              audio: false
            }
          };
        });
      } else {
        // For standard OpenAI, retrieve all models (same logic as connection page)
        return data.data.map((model: any) => {
          // Automatically detect multimodal support for GPT-4 series models
          const supportsMultimodal = model.id.includes('gpt-4') && (
            model.id.includes('vision') || 
            model.id.includes('gpt-4o') ||
            model.id.includes('gpt-4-turbo')
          );
          
          return {
            modelId: model.id,
            supportsMultimodal,
            capabilities: {
              // Infer capabilities from model name (same logic as connection page)
              chat: model.id.includes('gpt') || model.id.includes('llama') || model.id.includes('mistral') || model.id.includes('qwen') || !model.id.includes('dall-e') && !model.id.includes('whisper'),
              image: model.id.includes('dall-e') || model.id.includes('vision') || model.id.includes('-VL'),
              audio: model.id.includes('whisper') || model.id.includes('tts')
            }
          };
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch OpenAI models:', err);
  }
  return [];
}

// Ollama model lookup function
async function fetchOllamaModels(server: any) {
  try {
    const response = await fetch(`${server.baseUrl}/api/tags`);
    
    if (response.ok) {
      const data = await response.json();
      return data.models?.map((model: any) => ({
        modelId: model.name,
        supportsMultimodal: false, // Ollama models don't support multimodal by default
        capabilities: {
          chat: true,
          image: false,
          audio: false
        },
        contextLength: model.details?.parameter_size
      })) || [];
    }
  } catch (err) {
    console.error('Failed to fetch Ollama models:', err);
  }
  return [];
}

// Gemini model lookup function
async function fetchGeminiModels(server: any) {
  if (!server.apiKey) return [];
  
  try {
    const response = await fetch(`${server.baseUrl}/models?key=${server.apiKey}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.models?.map((model: any) => {
        // Check if model supports vision/multimodal
        const supportsMultimodal = model.supportedGenerationMethods?.includes('generateContent') && 
                                   (model.inputTokenLimit > 100000 || model.name.includes('vision'));
        
        return {
          modelId: model.name.replace('models/', ''), // Remove 'models/' prefix
          supportsMultimodal,
          capabilities: {
            chat: true, // Most Gemini models support chat
            image: supportsMultimodal,
            audio: false // Currently no audio support in standard Gemini models
          },
          contextLength: model.inputTokenLimit
        };
      }) || [];
    }
  } catch (err) {
    console.error('Failed to fetch Gemini models:', err);
  }
  return [];
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ModelSettingsPage() {
  console.log('=== Model 페이지 로드 시작 ===');
  
  // Fetch enabled LLM servers
  const enabledServers = await llmServerRepository.findEnabled();
  console.log('활성화된 서버 수:', enabledServers.length);
  
  // Query each enabled server's models and sync with DB
  for (const server of enabledServers) {
    console.log(`서버 ${server.name} (${server.provider}) 모델 동기화 시작`);
    
    let models = [];
    
    // Query models by provider
    if (server.provider === 'openai') {
      models = await fetchOpenAIModels(server);
    } else if (server.provider === 'ollama') {
      models = await fetchOllamaModels(server);
    } else if (server.provider === 'gemini') {
      models = await fetchGeminiModels(server);
    }
    
    console.log(`서버 ${server.name}에서 ${models.length}개 모델 발견`);
    
    // Upsert queried models to DB
    for (const model of models) {
      try {
        await llmModelRepository.upsert({
          serverId: server.id,
          modelId: model.modelId,
          provider: server.provider,
          capabilities: model.capabilities,
          contextLength: model.contextLength,
          supportsMultimodal: model.supportsMultimodal
          // enabled and isPublic are not passed
          // - New models: set to disabled (false) by default
          // - Existing models: maintain current status
        });
      } catch (err) {
        console.error('Error upserting model:', err);
      }
    }
  }
  
  console.log('모든 서버 모델 동기화 완료');
  
  // Get updated servers and models after sync
  const [servers, modelsWithServer] = await Promise.all([
    llmServerRepository.findEnabled(),
    llmModelRepository.findAllWithServer()
  ])
  
  // Group models by server (including server information)
  const modelsByServer = modelsWithServer.reduce((acc: Record<string, any[]>, model: any) => {
    if (!acc[model.serverId]) {
      acc[model.serverId] = []
    }
    acc[model.serverId].push({
      ...model,
      capabilities: model.capabilities ? JSON.parse(model.capabilities) : null
    })
    return acc
  }, {})
  
  // Combine server information and model information
  const serversWithModels = servers.map((server: any) => ({
    ...server,
    models: modelsByServer[server.id] || []
  }))
  
  console.log('최종 서버별 모델 수:', serversWithModels.map((s: any) => ({ name: s.name, modelCount: s.models.length })));
  console.log('=== Model 페이지 로드 완료 ===');
  
  return <ModelManagementForm initialServers={serversWithModels} />
} 
