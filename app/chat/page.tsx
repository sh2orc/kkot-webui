import EmptyChat from "@/components/contents/empty-chat"
import { agentManageRepository, llmModelRepository, convertImageDataToDataUrl } from "@/lib/db/server"

export const dynamic = 'force-dynamic'

export default async function Page() {
  // SSR로 에이전트와 공개 모델 목록 가져오기
  const [agents, publicModels] = await Promise.all([
    agentManageRepository.findAllWithModelAndServer(),
    llmModelRepository.findPublic()
  ])
  
  // 에이전트 데이터 변환 (이미지 포함)
  const processedAgents = agents
    .filter((agent: any) => agent.enabled) // 활성화된 에이전트만
    .map((agent: any) => {
      let imageData: string | null = null
      let hasImage = false
      
      if (agent.imageData) {
        hasImage = true
        imageData = convertImageDataToDataUrl(agent.imageData)
      }
      
      return {
        ...agent,
        imageData: undefined, // 클라이언트로 전송하지 않음
        hasImage,
        type: 'agent' as const // 타입 구분을 위한 필드
      }
    })
  
  // 공개 모델 데이터 변환
  const processedPublicModels = publicModels.map((model: any) => ({
    ...model,
    capabilities: model.capabilities ? JSON.parse(model.capabilities) : null,
    type: 'model' as const // 타입 구분을 위한 필드
  }))
  
  // 기본 선택될 모델 결정 (첫 번째 에이전트 또는 첫 번째 공개 모델)
  let defaultModel = null
  if (processedAgents.length > 0) {
    defaultModel = processedAgents[0]
  } else if (processedPublicModels.length > 0) {
    defaultModel = processedPublicModels[0]
  }
  
  return (
    <EmptyChat 
      initialAgents={processedAgents}
      initialPublicModels={processedPublicModels}
      defaultModel={defaultModel}
    />
  )
}
