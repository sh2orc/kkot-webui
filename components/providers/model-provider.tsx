"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react"
import { 
  clearSessionAndRedirect, 
  isAuthError, 
  getErrorMessage, 
  handleApiResponse,
  isValidArray 
} from "@/lib/session-utils"

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
  serverName?: string
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
  const prevModelListRef = useRef<{ agents: Agent[], publicModels: PublicModel[] }>({ agents: [], publicModels: [] })

  // Function to fetch agents and public models list
  const fetchModelsAndAgents = async () => {
    try {
      setIsLoading(true)
      setError(null) // Clear previous errors
      
      const response = await fetch('/api/agents')
      
      // Use utility function to handle API response and authentication
      const data = await handleApiResponse(response)
      
      // Ensure data is an object before accessing properties
      if (!data || typeof data !== 'object') {
        setAgents([])
        setPublicModels([])
        return
      }
      
      // Safely process agents data using utility function
      if (isValidArray(data.agents)) {
        setAgents(data.agents)
      } else {
        setAgents([])
      }
      
      // Safely process public models data using utility function
      if (isValidArray(data.publicModels)) {
        setPublicModels(data.publicModels)
      } else {
        setPublicModels([])
      }
      
      // Access localStorage only in browser environment
      if (typeof window !== 'undefined') {
        try {
          const savedModelId = localStorage.getItem('selectedModelId')
          const savedModelType = localStorage.getItem('selectedModelType')
          
          if (savedModelId && savedModelType) {
            // Find model by saved model ID
            let modelFound = false
            
            if (savedModelType === 'agent' && isValidArray(data.agents)) {
              const savedAgent = data.agents.find((agent: Agent) => agent && agent.id === savedModelId)
              if (savedAgent) {
                setSelectedModel(savedAgent)
                modelFound = true
              }
            } else if (savedModelType === 'model' && isValidArray(data.publicModels)) {
              const savedModel = data.publicModels.find((model: PublicModel) => model && model.id === savedModelId)
              if (savedModel) {
                setSelectedModel(savedModel)
                modelFound = true
              }
            }
            
            // If saved model not found, select first available agent or model
            if (!modelFound) {
              if (isValidArray(data.agents) && data.agents.length > 0) {
                // Prefer agents over models
                const firstAgent = data.agents[0]
                if (firstAgent) {
                  setSelectedModel(firstAgent)
                  saveSelectedModelToLocalStorage(firstAgent)
                }
              } else if (isValidArray(data.publicModels) && data.publicModels.length > 0) {
                // Select first public model if no agents
                const firstModel = data.publicModels[0]
                if (firstModel) {
                  setSelectedModel(firstModel)
                  saveSelectedModelToLocalStorage(firstModel)
                }
              }
            }
          } else if (isValidArray(data.agents) && data.agents.length > 0) {
            // Select first agent if no saved model
            const firstAgent = data.agents[0]
            if (firstAgent) {
              setSelectedModel(firstAgent)
              saveSelectedModelToLocalStorage(firstAgent)
            }
          } else if (isValidArray(data.publicModels) && data.publicModels.length > 0) {
            // Select first public model if no agents
            const firstModel = data.publicModels[0]
            if (firstModel) {
              setSelectedModel(firstModel)
              saveSelectedModelToLocalStorage(firstModel)
            }
          }
        } catch (localStorageError) {
          console.error('Error accessing localStorage:', localStorageError)
        }
      }
      
    } catch (err) {
      console.error('Error fetching agents and models list:', err)
      
      // Handle authentication errors using utility function
      if (isAuthError(err)) {
        await clearSessionAndRedirect('Authentication expired while fetching agents')
        return // Early return as clearSessionAndRedirect handles everything
      }
      
      // Get user-friendly error message
      const errorMessage = getErrorMessage(err, 'Failed to load agent list')
      setError(errorMessage)
      
      // Set empty defaults on error
      setAgents([])
      setPublicModels([])
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
  const handleSetSelectedModel = useCallback((model: ModelOrAgent | null) => {
    setSelectedModel(model)
    saveSelectedModelToLocalStorage(model)
  }, [])

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
        let modelFound = false
        
        if (savedModelType === 'agent') {
          const savedAgent = initialAgents.find(agent => agent.id === savedModelId)
          if (savedAgent) {
            setSelectedModel(savedAgent)
            modelFound = true
          }
        } else if (savedModelType === 'model') {
          const savedModel = initialPublicModels.find(model => model.id === savedModelId)
          if (savedModel) {
            setSelectedModel(savedModel)
            modelFound = true
          }
        }
        
        // If saved model not found, select first available agent or model
        if (!modelFound) {
          if (initialAgents.length > 0) {
            // Prefer agents over models
            const firstAgent = initialAgents[0]
            setSelectedModel(firstAgent)
            saveSelectedModelToLocalStorage(firstAgent)
            return
          } else if (initialPublicModels.length > 0) {
            // Select first public model if no agents
            const firstModel = initialPublicModels[0]
            setSelectedModel(firstModel)
            saveSelectedModelToLocalStorage(firstModel)
            return
          }
        } else {
          return // Model found and selected, exit
        }
      }
      
      // Select default model if no saved model
      if (defaultModel) {
        setSelectedModel(defaultModel)
        saveSelectedModelToLocalStorage(defaultModel)
      } else if (initialAgents.length > 0) {
        // No default model provided, prefer agents
        const firstAgent = initialAgents[0]
        setSelectedModel(firstAgent)
        saveSelectedModelToLocalStorage(firstAgent)
      } else if (initialPublicModels.length > 0) {
        // No agents, select first model
        const firstModel = initialPublicModels[0]
        setSelectedModel(firstModel)
        saveSelectedModelToLocalStorage(firstModel)
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

  // Check if selected model still exists when agents/models list changes
  useEffect(() => {
    if (!isInitialized || isLoading) return
    
    // Check if lists have actually changed
    const listsChanged = 
      prevModelListRef.current.agents.length !== agents.length ||
      prevModelListRef.current.publicModels.length !== publicModels.length ||
      !prevModelListRef.current.agents.every(a => agents.some(b => b.id === a.id)) ||
      !prevModelListRef.current.publicModels.every(a => publicModels.some(b => b.id === a.id))
    
    if (!listsChanged) return
    
    // Update ref with new lists
    prevModelListRef.current = { agents, publicModels }
    
    if (!selectedModel) return
    
    // Check if current selected model exists in the lists
    const modelExists = selectedModel.type === 'agent' 
      ? agents.some(agent => agent.id === selectedModel.id)
      : publicModels.some(model => model.id === selectedModel.id)
    
    if (!modelExists) {
      // Select first available agent or model
      if (agents.length > 0) {
        const firstAgent = agents[0]
        handleSetSelectedModel(firstAgent)
      } else if (publicModels.length > 0) {
        const firstModel = publicModels[0]
        handleSetSelectedModel(firstModel)
      } else {
        // No models available
        handleSetSelectedModel(null)
      }
    }
  }, [agents, publicModels, selectedModel, isInitialized, isLoading, handleSetSelectedModel])

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