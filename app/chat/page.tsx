import EmptyChat from "@/components/contents/empty-chat"
import { agentManageRepository, llmModelRepository, convertImageDataToDataUrl } from "@/lib/db/server"
import { getServerSession } from "next-auth"
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route"
import { loadTranslationModule } from "@/lib/i18n-server"
import { headers } from "next/headers"
import { filterResourcesByPermission } from "@/lib/auth/permissions"

export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"

export default async function Page() {
  // Get session information from server
  const authOptions = await getAuthOptions()
  const session = await getServerSession(authOptions)
  
  // 미들웨어에서 이미 인증 및 권한 검증을 완료했으므로
  // 여기서는 session이 존재한다고 가정할 수 있음
  if (!session || !session.user?.email) {
    console.error('[Chat Page] Unexpected: session is null after middleware')
    redirect('/auth')
  }
  
  // Extract language information from Accept-Language header (default: 'kor')
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const preferredLanguage = acceptLanguage.includes('en') ? 'eng' : 'kor'
  
  // Get agent and public model lists via SSR
  const [agents, allModels, chatTranslations] = await Promise.all([
    agentManageRepository.findAllWithModelAndServer(),
    llmModelRepository.findAllChatModelsWithServer(), // Get all models, not just public
    loadTranslationModule(preferredLanguage, 'chat')
  ])
  
  // Filter models based on user permissions
  const publicModels = await filterResourcesByPermission(
    allModels,
    'model',
    'enabled'
  )
  
  // Filter agents based on user permissions
  const accessibleAgents = await filterResourcesByPermission(
    agents,
    'agent',
    'enabled'
  )
  
  // Transform agent data (including images)
  const processedAgents = accessibleAgents
    .filter((agent: any) => agent.enabled) // Only enabled agents
    .map((agent: any) => {
      let imageData: string | null = null
      let hasImage = false
      
      if (agent.imageData) {
        hasImage = true
        imageData = convertImageDataToDataUrl(agent.imageData)
      }
      
      return {
        ...agent,
        imageData,
        hasImage,
        type: 'agent' as const // Field for type distinction
      }
    })
  
  // Transform public model data  
  const processedPublicModels = publicModels
    .filter((model: any) => model.enabled) // Only enabled models
    .map((model: any) => ({
    ...model,
    capabilities: model.capabilities ? JSON.parse(model.capabilities) : null,
    type: 'model' as const // Field for type distinction
  }))
  
  // Determine default model to be selected (first agent or first public model)
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
      session={session}
      initialTranslations={chatTranslations}
      preferredLanguage={preferredLanguage}
    />
  )
}
