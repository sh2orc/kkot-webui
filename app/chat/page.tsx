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
  
  // 세션이 없으면 즉시 /auth로 리다이렉트
  if (!session) {
    redirect('/auth')
  }
  
  // 게스트 사용자는 안내 페이지로 리다이렉트
  if (session.user.role === 'guest') {
    redirect('/auth/pending')
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
