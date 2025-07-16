import EmptyChat from "@/components/contents/empty-chat"
import { agentManageRepository, llmModelRepository, convertImageDataToDataUrl } from "@/lib/db/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { loadTranslationModule } from "@/lib/i18n-server"
import { headers } from "next/headers"

export const dynamic = 'force-dynamic'

export default async function Page() {
  // Get session information from server
  const session = await getServerSession(authOptions)
  
  // Extract language information from Accept-Language header (default: 'kor')
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const preferredLanguage = acceptLanguage.includes('en') ? 'eng' : 'kor'
  
  // Get agent and public model lists via SSR
  const [agents, publicModels, chatTranslations] = await Promise.all([
    agentManageRepository.findAllWithModelAndServer(),
    llmModelRepository.findPublic(),
    loadTranslationModule(preferredLanguage, 'chat')
  ])
  
  // Transform agent data (including images)
  const processedAgents = agents
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
  const processedPublicModels = publicModels.map((model: any) => ({
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
