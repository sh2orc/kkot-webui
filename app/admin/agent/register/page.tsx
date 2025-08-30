import { agentManageRepository, llmModelRepository, convertImageDataToDataUrl } from '@/lib/db/server'
import AgentRegisterForm from './agent-register-form'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgentRegisterPage({
  searchParams
}: {
  searchParams: { id?: string }
}) {
  // Handle searchParams asynchronously
  const params = await Promise.resolve(searchParams)
  const editingId = params?.id
  
  // Fetch model list
  const allModels = await llmModelRepository.findEnabled()
  
  // Fetch agent data if in edit mode
  let agentData = null
  let imageData = null
  
  if (editingId) {
    try {
      console.log('Starting agent data load:', editingId)
      
      // Directly retrieve agent basic information
      const agentResult = await agentManageRepository.findById(editingId)
      
      if (agentResult && agentResult.length > 0) {
        const agent = agentResult[0]
        
        // Convert and pass image data on server side
        if (agent.imageData) {
          console.log('Converting image data on server...')
          imageData = convertImageDataToDataUrl(agent.imageData)
          console.log(`Agent ${editingId} image SSR conversion:`, imageData ? 'success' : 'failed')
        }
        
        // Extract only necessary data
        agentData = {
          id: agent.id,
          agentId: agent.agentId, // Use actual agentId field
          modelId: agent.modelId,
          name: agent.name,
          systemPrompt: agent.systemPrompt || '',
          temperature: agent.temperature || '0.7',
          topK: agent.topK || 50,
          topP: agent.topP || '0.95',
          maxTokens: agent.maxTokens || 2048,
          presencePenalty: agent.presencePenalty || '0.0',
          frequencyPenalty: agent.frequencyPenalty || '0.0',
          description: agent.description || '',
          enabled: agent.enabled,
          supportsDeepResearch: agent.supportsDeepResearch,
          supportsWebSearch: agent.supportsWebSearch,
          parameterEnabled: agent.parameterEnabled
        }
      } else {
        // Find from full list if basic query fails
        const agents = await agentManageRepository.findAllWithModelAndServer()
        const agent = agents.find((a: any) => a.id === editingId)
        
        if (agent) {
          // Convert and pass image data on server side
          if (agent.imageData) {
            console.log('Converting image data on server...')
            imageData = convertImageDataToDataUrl(agent.imageData)
            console.log(`Agent ${editingId} image SSR conversion:`, imageData ? 'success' : 'failed')
          }
          
          // Extract only necessary data
          agentData = {
            id: agent.id,
            agentId: agent.agentId, // Use actual agentId field
            modelId: agent.modelId,
            name: agent.name,
            systemPrompt: agent.systemPrompt || '',
            temperature: agent.temperature || '0.7',
            topK: agent.topK || 50,
            topP: agent.topP || '0.95',
            maxTokens: agent.maxTokens || 2048,
            presencePenalty: agent.presencePenalty || '0.0',
            frequencyPenalty: agent.frequencyPenalty || '0.0',
            description: agent.description || '',
            enabled: agent.enabled,
            supportsDeepResearch: agent.supportsDeepResearch,
            supportsWebSearch: agent.supportsWebSearch,
            parameterEnabled: agent.parameterEnabled
          }
        }
      }
      
      // Redirect if agent data is not found
      if (!agentData) {
        console.log('Agent not found, redirecting to registration page:', editingId)
        redirect('/admin/agent/register')
      }
    } catch (error) {
      console.error('Agent data load failed:', error)
      // Redirect to registration page even on error
      redirect('/admin/agent/register')
    }
  }
  
  return (
    <AgentRegisterForm
      editingId={editingId}
      initialAgentData={agentData}
      initialImageData={imageData}
      enabledModels={allModels}
    />
  )
} 