"use client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, FlaskRoundIcon as Flask, Zap, Send } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslation } from "@/lib/i18n"
import { useModel, type Agent, type PublicModel } from "@/components/providers/model-provider"

// Types are imported from model-provider

interface EmptyChatProps {
  initialAgents?: Agent[]
  initialPublicModels?: PublicModel[]
  defaultModel?: Agent | PublicModel | null
  session?: any
  initialTranslations?: any
  preferredLanguage?: string
}

export default function Component({ 
  initialAgents, 
  initialPublicModels, 
  defaultModel, 
  session: serverSession,
  initialTranslations,
  preferredLanguage 
}: EmptyChatProps = {}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGlobeActive, setIsGlobeActive] = useState(false)
  const [isFlaskActive, setIsFlaskActive] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Ref to prevent duplicate submissions
  const submitInProgress = useRef(false)
  
  // Use model selected from navbar
  const { selectedModel, setInitialData } = useModel()
  const { data: session } = useSession()
  
  // Use server session info if available, otherwise use client session
  const currentSession = serverSession || session

  const router = useRouter()
  const { lang } = useTranslation("chat")
  
  // Set initial data if available
  useEffect(() => {
    if (initialAgents || initialPublicModels) {
      setInitialData(
        initialAgents || [], 
        initialPublicModels || [], 
        defaultModel
      )
    }
  }, [initialAgents, initialPublicModels, defaultModel, setInitialData])



  const prompts = [
    {
      title: lang("prompts.0.title"),
      description: lang("prompts.0.description"),
    },
    {
      title: lang("prompts.1.title"),
      description: lang("prompts.1.description"),
    },
    {
      title: lang("prompts.2.title"),
      description: lang("prompts.2.description"),
    },
    {
      title: lang("prompts.3.title"),
      description: lang("prompts.3.description"),
    },
  ]

  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "48px"
    const newHeight = Math.min(textarea.scrollHeight, 400)
    textarea.style.height = `${newHeight}px`
    
    // Hide scrollbar for single line, show scrollbar only for multiple lines
    const lineHeight = 24 // Approximate line height (text-sm leading-6)
    const singleLineHeight = 48 + lineHeight // minHeight + one line
    
    if (newHeight <= singleLineHeight) {
      textarea.style.overflowY = "hidden"
    } else {
      textarea.style.overflowY = "auto"
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    // Check state show/hide only when empty (minimize state changes)
    const isEmpty = value.trim().length === 0
    setIsExpanded(prev => {
      if (isEmpty && prev) return false
      if (!isEmpty && !prev) return true
      return prev
    })
  }, [])

  // Adjust height with input event (separate from onChange)
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    adjustTextareaHeight(textarea)
  }, [adjustTextareaHeight])

  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() && !isSubmitting && selectedModel && currentSession?.user?.id) {
      // Stop if already submitting
      if (submitInProgress.current) {
        console.log('Submit already in progress, skipping duplicate call')
        return
      }

      submitInProgress.current = true
      setIsSubmitting(true)
      
      try {
        console.log('=== Client: Chat session creation request started ===')
        console.log('Selected model:', selectedModel)
        console.log('Initial message:', inputValue)
        console.log('User ID:', currentSession.user.id)
        
        // Call API to create new chat session
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: selectedModel.type === 'agent' ? selectedModel.id : undefined,
            modelId: selectedModel.type === 'model' ? selectedModel.id : undefined,
            modelType: selectedModel.type,
            initialMessage: inputValue,
            userId: currentSession.user.id
          })
        })

        console.log('=== Client: Response received ===')
        console.log('Response status:', response.status)
        console.log('Response OK:', response.ok)
        console.log('Response headers:', response.headers)

        if (!response.ok) {
          const errorText = await response.text()
          console.log('Error response content:', errorText)
          throw new Error(`Failed to create chat session (${response.status}: ${errorText})`)
        }

        const data = await response.json()
        console.log('=== Client: Response data ===')
        console.log('Response data:', data)
        
        const chatId = data.chatId
        console.log('Chat ID:', chatId)

        // Save agent information to localStorage (for streaming response)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`chat_${chatId}_agent`, JSON.stringify({
            id: selectedModel.id,
            type: selectedModel.type
          }))
        }

        // Add new chat to sidebar immediately
        if (typeof window !== 'undefined') {
          const newChatData = {
            id: chatId,
            title: inputValue.substring(0, 20) + (inputValue.length > 20 ? '...' : ''),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          // Dispatch event to add new chat to sidebar
          window.dispatchEvent(new CustomEvent('newChatCreated', { 
            detail: { chat: newChatData } 
          }))
          
          // Also refresh sidebar as fallback
          if ((window as any).refreshSidebar) {
            (window as any).refreshSidebar()
          }
        }

        // Navigate to created chat ID page (no sensitive information exposed in URL)
        router.push(`/chat/${chatId}`)
        
        // Reset input field
        setInputValue("")
        setIsExpanded(false)
        
        // Reset height
        if (textareaRef.current) {
          textareaRef.current.style.height = "48px"
        }
        
      } catch (error) {
        console.error('=== Client: Chat session creation error ===')
        console.error('Error details:', error)
        if (error instanceof Error) {
          console.error('Error stack:', error.stack)
        }
        // Error handling - show notification to user
        alert('Failed to start chat. Please try again.')
      } finally {
        setIsSubmitting(false)
        submitInProgress.current = false
      }
    }
  }, [inputValue, router, isSubmitting, selectedModel, currentSession?.user?.id])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
    }

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: Allow line break (default behavior)
        return
      } else {
        // Enter only: Submit action
        e.preventDefault()
        handleSubmit()
      }
    }
  }, [handleSubmit])

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
  }, [])

  const handlePromptClick = useCallback((prompt: string) => {
    setInputValue(prompt)
    setIsExpanded(true)
    
    // Set focus to textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Adjust height
      adjustTextareaHeight(textareaRef.current)
    }
  }, [adjustTextareaHeight])

      // Agent or model selection handler


  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current)
    }
  }, [])

      // Image data processing function
  const getAvatarContent = (model: Agent | PublicModel | null) => {
    if (!model) return 'AI'
    
          // If it's an agent and has an image
    if (model.type === 'agent' && (model as Agent).imageData) {
      const imageData = (model as Agent).imageData!
              // Check if it's already in data: URL format
      const imageSrc = imageData.startsWith('data:') 
        ? imageData 
        : `data:image/png;base64,${imageData}`
      return <img src={imageSrc} alt={(model as Agent).name || ''} />
    }
    
    // 첫 글자 가져오기
    const letter = model.type === 'agent' 
      ? ((model as Agent).name || '').charAt(0).toUpperCase()
      : ((model as PublicModel).provider || '').charAt(0).toUpperCase()
      
    return letter || 'AI'
  }
  
  // 배경색 결정 함수
  const getAvatarBackground = (model: Agent | PublicModel | null) => {
    if (!model) return 'bg-red-500'
    
    switch(model.type) {
      case 'agent':
        return 'bg-green-500'
      case 'model':
        const provider = (model as PublicModel).provider?.toLowerCase()
        if (provider?.includes('openai')) return 'bg-blue-500'
        if (provider?.includes('google')) return 'bg-yellow-500'
        if (provider?.includes('gemini')) return 'bg-teal-500'
        return 'bg-purple-500'
      default:
        return 'bg-red-500'
    }
  }

  return (
    <>
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Initial State Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full pb-32 md:pb-6">
          {/* 사용자 환영 메시지 */}
          {currentSession?.user && (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                안녕하세요, {currentSession.user.name}님! 👋
              </h1>
              <p className="text-lg text-gray-600">
                오늘은 어떤 것을 도와드릴까요?
              </p>
            </div>
          )}



          {/* Central Input Area */}
          <div className="w-full max-w-3xl mb-8">
            {/* Desktop Input */}
            <div className="hidden md:block">
              <div className="flex-1 flex flex-col relative w-full shadow-lg rounded-3xl border border-gray-50 dark:border-gray-850 hover:border-gray-100 focus-within:border-gray-100 hover:dark:border-gray-800 focus-within:dark:border-gray-800 transition px-1 bg-white/90 dark:bg-gray-400/5 dark:text-gray-100">
                <div className="flex flex-col p-4">
                  {/* Text Area */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      placeholder={lang("placeholder")}
                      className="w-full rounded-lg border border-gray-200 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-400 text-sm leading-6 min-h-[48px] max-h-[300px]"
                      value={inputValue}
                      onChange={handleInputChange}
                      onInput={handleInput}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                      disabled={!selectedModel}
                    />
                  </div>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full">
                      <Plus className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10">
                        <Mic className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isFlaskActive ? "bg-black text-white hover:bg-blue-700 hover:text-white" : "hover:bg-transparent"}`}
                        onClick={() => setIsFlaskActive(!isFlaskActive)}
                      >
                        <Flask className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isGlobeActive ? "bg-black text-white hover:bg-blue-700 hover:text-white" : "hover:bg-transparent"}`}
                        onClick={() => setIsGlobeActive(!isGlobeActive)}
                      >
                        <Globe className="h-5 w-5" />
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || isSubmitting || !selectedModel}
                        className="h-10 w-10 p-0 rounded-full bg-blue-600 hover:bg-blue-700 hover:text-white text-white disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Input - Fixed at bottom */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    placeholder={lang("mobilePlaceholder")}
                    className="w-full rounded-2xl border border-gray-200 p-3 pr-12 resize-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-400 text-sm leading-6 min-h-[48px] max-h-[120px]"
                    value={inputValue}
                    onChange={handleInputChange}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    disabled={!selectedModel}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || isSubmitting || !selectedModel}
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt Suggestions */}
          {selectedModel && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
              {prompts.map((prompt, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors bg-white hover:bg-gray-50"
                  onClick={() => handlePromptClick(prompt.title)}
                >
                  <h3 className="font-medium text-gray-900 mb-1">{prompt.title}</h3>
                  <p className="text-sm text-gray-600">{prompt.description}</p>
                </div>
              ))}
            </div>
          )}
          
        </div>

        {/* Keyboard Shortcut Hint */}
        {isExpanded && (
          <div className="hidden md:block absolute bottom-4 right-4">
            <div className="bg-gray-100 text-gray-600 text-xs px-3 py-2 rounded-lg">
              <kbd className="bg-white px-2 py-1 rounded border text-xs mr-1">Enter</kbd>
              {lang("shortcuts.send")} |
              <kbd className="bg-white px-2 py-1 rounded border text-xs mx-1">Shift</kbd>
              +
              <kbd className="bg-white px-2 py-1 rounded border text-xs ml-1">Enter</kbd>
              {lang("shortcuts.lineBreak")}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
