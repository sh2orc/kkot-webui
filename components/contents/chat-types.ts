export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isDeepResearch?: boolean
  deepResearchStepType?: 'step' | 'synthesis' | 'final'
  isDeepResearchComplete?: boolean
  hasDeepResearchError?: boolean
  isDeepResearchAborted?: boolean
  deepResearchStepInfo?: Record<string, any>
}

export interface ChatPageProps {
  chatId?: string
} 