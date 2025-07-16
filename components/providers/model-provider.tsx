"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

// Type definitions for agents and models
export interface Agent {
  id: string
  agentId: string
  name: string
  modelId: string
  description?: string
  imageData?: string
  type: 'agent'
  modelName?: string
  modelProvider?: string
  enabled: boolean | number
  supportsMultimodal?: boolean | number
  modelSupportsMultimodal?: boolean | number
  supportsDeepResearch?: boolean | number
  supportsWebSearch?: boolean | number
}

export interface PublicModel {
  id: string
  modelId: string
  provider: string
  serverId: string
  capabilities?: { 
    chat?: boolean
    image?: boolean
    audio?: boolean
  } | null
  type: 'model'
  enabled: boolean | number
  supportsMultimodal?: boolean | number
}

export type ModelOrAgent = Agent | PublicModel

interface ModelContextType {
  selectedModel: ModelOrAgent | null
  agents: Agent[]
  publicModels: PublicModel[]
  isLoading: boolean
  error: string | null
  setSelectedModel: (model: ModelOrAgent | null) => void
  fetchModelsAndAgents: () => Promise<void>
  setInitialData: (agents: Agent[], publicModels: PublicModel[], defaultModel?: ModelOrAgent | null) => void
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function ModelProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<ModelOrAgent | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [publicModels, setPublicModels] = useState<PublicModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Function to fetch agents and public models list
  const fetchModelsAndAgents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/agents')
      
      // Handle authentication error
      if (response.status === 401) {
        console.log('Authentication required')
        // Only redirect if not already on auth page
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          console.log('Redirecting to login page...')
          window.location.href = '/auth'
        }
        return
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent list: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.agents && Array.isArray(data.agents)) {
        setAgents(data.agents)
      }
      
      if (data.publicModels && Array.isArray(data.publicModels)) {
        setPublicModels(data.publicModels)
      }
      
      // Access localStorage only in browser environment
      if (typeof window !== 'undefined') {
        const savedModelId = localStorage.getItem('selectedModelId')
        const savedModelType = localStorage.getItem('selectedModelType')
        
        if (savedModelId && savedModelType) {
          // Find model by saved model ID
          if (savedModelType === 'agent') {
            const savedAgent = data.agents?.find((agent: Agent) => agent.id === savedModelId)
            if (savedAgent) {
              setSelectedModel(savedAgent)
            }
          } else if (savedModelType === 'model') {
            const savedModel = data.publicModels?.find((model: PublicModel) => model.id === savedModelId)
            if (savedModel) {
              setSelectedModel(savedModel)
            }
          }
        } else if (data.agents && data.agents.length > 0) {
          // Select first agent if no saved model
          setSelectedModel(data.agents[0])
          saveSelectedModelToLocalStorage(data.agents[0])
        } else if (data.publicModels && data.publicModels.length > 0) {
          // Select first public model if no agents
          setSelectedModel(data.publicModels[0])
          saveSelectedModelToLocalStorage(data.publicModels[0])
        }
      }
      
    } catch (err) {
      console.error('Error fetching agents and models list:', err)
      setError('Failed to load agent list')
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }
  
  // Function to save selected model to localStorage
  const saveSelectedModelToLocalStorage = (model: ModelOrAgent | null) => {
    if (typeof window !== 'undefined') {
      if (model) {
        localStorage.setItem('selectedModelId', model.id)
        localStorage.setItem('selectedModelType', model.type)
      } else {
        localStorage.removeItem('selectedModelId')
        localStorage.removeItem('selectedModelType')
      }
    }
  }

  // Wrap model selection handler to also save to localStorage
  const handleSetSelectedModel = (model: ModelOrAgent | null) => {
    setSelectedModel(model)
    saveSelectedModelToLocalStorage(model)
  }

  // Initial data setup function
  const setInitialData = (initialAgents: Agent[], initialPublicModels: PublicModel[], defaultModel?: ModelOrAgent | null) => {
    setAgents(initialAgents)
    setPublicModels(initialPublicModels)
    setError(null)
    setIsLoading(false)
    setIsInitialized(true)
    
    // Check previously selected model from localStorage
    if (typeof window !== 'undefined') {
      const savedModelId = localStorage.getItem('selectedModelId')
      const savedModelType = localStorage.getItem('selectedModelType')
      
      if (savedModelId && savedModelType) {
        // Find model by saved model ID
        if (savedModelType === 'agent') {
          const savedAgent = initialAgents.find(agent => agent.id === savedModelId)
          if (savedAgent) {
            setSelectedModel(savedAgent)
            return
          }
        } else if (savedModelType === 'model') {
          const savedModel = initialPublicModels.find(model => model.id === savedModelId)
          if (savedModel) {
            setSelectedModel(savedModel)
            return
          }
        }
      }
      
      // Select default model if no saved model or can't find it
      if (defaultModel) {
        setSelectedModel(defaultModel)
        saveSelectedModelToLocalStorage(defaultModel)
      }
    }
  }

  // Fetch agent list on component mount (only when initial data is not available)
  useEffect(() => {
    // Skip API call on auth pages
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
      setIsInitialized(true)
      setIsLoading(false)
      return
    }
    
    // Call API only if not initialized
    if (!isInitialized) {
      fetchModelsAndAgents()
    }
  }, []) // Empty dependency array - runs once on mount

  return (
    <ModelContext.Provider
      value={{
        selectedModel,
        agents,
        publicModels,
        isLoading,
        error,
        setSelectedModel: handleSetSelectedModel,
        fetchModelsAndAgents,
        setInitialData
      }}
    >
      {children}
    </ModelContext.Provider>
  )
}

// Custom hook to make context usage easier
export function useModel() {
  const context = useContext(ModelContext)
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider')
  }
  return context
} 