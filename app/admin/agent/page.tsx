import { agentManageRepository, llmModelRepository, convertImageDataToDataUrl } from "@/lib/db/server"
import AgentManagementForm from "./agent-management-form"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgentSettingsPage() {
  // Fetching data with SSR
  const [agents, enabledModels] = await Promise.all([
    agentManageRepository.findAllWithModelAndServer(),
    llmModelRepository.findEnabled()
  ])
  
  // Transform agents data with image data conversion
  const agentsWithModel = agents.map((agent: any) => {
    // 이미지 데이터 서버 사이드에서 변환
    let imageData: string | null = null
    let hasImage = false
    
    if (agent.imageData) {
      hasImage = true
      imageData = convertImageDataToDataUrl(agent.imageData)
      console.log(`에이전트 ${agent.id} 이미지 SSR 변환:`, imageData ? '성공' : '실패')
    }
    
    return {
      ...agent,
      temperature: agent.temperature || '0.7',
      topP: agent.topP || '0.95',
      topK: agent.topK || 50,
      maxTokens: agent.maxTokens || 2048,
      hasImage,
      imageData // SSR로 변환된 이미지 데이터 전달
    }
  })
  
  return <AgentManagementForm initialAgents={agentsWithModel} enabledModels={enabledModels} />
} 