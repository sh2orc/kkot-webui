import { llmServerRepository, llmModelRepository } from "@/lib/db/server"
import ModelManagementForm from "./model-management-form"

export default async function ModelSettingsPage() {
  // Fetching data with SSR
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
  
  return <ModelManagementForm initialServers={serversWithModels} />
} 
