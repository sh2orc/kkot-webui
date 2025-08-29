import { llmServerRepository, llmModelRepository } from "@/lib/db/server"
import ConnectionSettingsForm from "./connection-settings-form"

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
      
      // Get all models and set default capabilities  
      return data.data.map((model: any) => ({
        modelId: model.id,
        capabilities: {
          // Infer capabilities from model name
          chat: model.id.includes('gpt') || model.id.includes('llama') || model.id.includes('mistral') || model.id.includes('qwen') || !model.id.includes('dall-e') && !model.id.includes('whisper'),
          image: model.id.includes('dall-e') || model.id.includes('vision') || model.id.includes('-VL'),
          audio: model.id.includes('whisper') || model.id.includes('tts')
        }
      }));
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
      return data.models?.map((model: any) => ({
        modelId: model.name.replace('models/', ''), // Remove 'models/' prefix
        capabilities: {
          chat: true, // Most Gemini models support chat
          image: model.supportedGenerationMethods?.includes('generateContent') && 
                 (model.inputTokenLimit > 100000 || model.name.includes('vision')), // Vision models typically have large context
          audio: false // Currently no audio support in standard Gemini models
        },
        contextLength: model.inputTokenLimit
      })) || [];
    }
  } catch (err) {
    console.error('Failed to fetch Gemini models:', err);
  }
  return [];
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConnectionSettingsPage() {
  // Fetch LLM server data with SSR
  const servers = await llmServerRepository.findAll()
  
  // Query each server's models and sync with DB
  for (const server of servers) {
    if (!server.enabled) continue;
    
    let models = [];
    
    // Query models by provider
    if (server.provider === 'openai') {
      models = await fetchOpenAIModels(server);
    } else if (server.provider === 'ollama') {
      models = await fetchOllamaModels(server);
    } else if (server.provider === 'gemini') {
      models = await fetchGeminiModels(server);
    }
    
    // Upsert queried models to DB
    for (const model of models) {
      try {
        await llmModelRepository.upsert({
          serverId: server.id,
          modelId: model.modelId,
          provider: server.provider,
          capabilities: model.capabilities,
          contextLength: model.contextLength
          // enabled and isPublic are not passed
          // - New models: set to disabled (false) by default
          // - Existing models: maintain current status
        });
      } catch (err) {
        console.error('Error upserting model:', err);
      }
    }
    
    // Update server's models field with actual model list
    if (models.length > 0) {
      try {
        const modelIds = models.map((model: any) => model.modelId);
        await llmServerRepository.update(server.id, {
          models: modelIds
        });
      } catch (err) {
        console.error('Error updating server models field:', err);
      }
    }
  }
  
  // Get updated server list and model information
  const [updatedServers, allModels] = await Promise.all([
    llmServerRepository.findAll(),
    llmModelRepository.findAll()
  ]);
  
  // Calculate model count per server
  const modelCountByServer = allModels.reduce((acc: Record<string, number>, model: any) => {
    acc[model.serverId] = (acc[model.serverId] || 0) + 1;
    return acc;
  }, {});
  
  // Classify servers by provider (including model count information)
  const serversByProvider = updatedServers.reduce((acc: Record<string, any[]>, server: any) => {
    if (!acc[server.provider]) {
      acc[server.provider] = []
    }
    acc[server.provider].push({
      ...server,
      models: server.models ? JSON.parse(server.models) : [],
      settings: server.settings ? JSON.parse(server.settings) : {},
      modelCount: modelCountByServer[server.id] || 0
    })
    return acc
  }, {})
  
  return <ConnectionSettingsForm initialServers={serversByProvider} />
} 
