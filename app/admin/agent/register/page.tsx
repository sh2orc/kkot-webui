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
  // searchParams를 비동기적으로 처리
  const params = await Promise.resolve(searchParams)
  const editingId = params?.id
  
  // 모델 목록 가져오기
  const allModels = await llmModelRepository.findEnabled()
  
  // 수정 모드인 경우 에이전트 데이터 가져오기
  let agentData = null
  let imageData = null
  
  if (editingId) {
    try {
      console.log('에이전트 데이터 로드 시작:', editingId)
      
      // 에이전트 기본 정보 직접 조회
      const agentResult = await agentManageRepository.findById(editingId)
      
      if (agentResult && agentResult.length > 0) {
        const agent = agentResult[0]
        
        // 서버 사이드에서 이미지 데이터를 변환하여 전달
        if (agent.imageData) {
          console.log('이미지 데이터 서버에서 변환 중...')
          imageData = convertImageDataToDataUrl(agent.imageData)
          console.log(`에이전트 ${editingId} 이미지 SSR 변환:`, imageData ? '성공' : '실패')
        }
        
        // 필요한 데이터만 추출
        agentData = {
          id: agent.id,
          agentId: agent.agentId, // 실제 agentId 필드 사용
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
        // 기본 조회 실패 시 전체 목록에서 찾기
        const agents = await agentManageRepository.findAllWithModelAndServer()
        const agent = agents.find((a: any) => a.id === editingId)
        
        if (agent) {
          // 서버 사이드에서 이미지 데이터를 변환하여 전달
          if (agent.imageData) {
            console.log('이미지 데이터 서버에서 변환 중...')
            imageData = convertImageDataToDataUrl(agent.imageData)
            console.log(`에이전트 ${editingId} 이미지 SSR 변환:`, imageData ? '성공' : '실패')
          }
          
          // 필요한 데이터만 추출
          agentData = {
            id: agent.id,
            agentId: agent.agentId, // 실제 agentId 필드 사용
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
      
      // 에이전트 데이터를 찾지 못한 경우 리다이렉트
      if (!agentData) {
        console.log('에이전트를 찾을 수 없음, 등록 페이지로 리다이렉트:', editingId)
        redirect('/admin/agent/register')
      }
    } catch (error) {
      console.error('에이전트 데이터 로드 실패:', error)
      // 에러 발생 시에도 등록 페이지로 리다이렉트
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