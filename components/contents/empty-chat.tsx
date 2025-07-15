"use client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, Search, Zap, Send, Play, Image as ImageIcon, X, Brain } from "lucide-react"
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
  const [isDeepResearchActive, setIsDeepResearchActive] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  // Image file input ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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
    
    // Set loading state to false to prevent skeleton UI from showing
    setIsInitialLoading(false)
    setShowSkeleton(false)
    
    return () => {
      // Cleanup function
    }
  }, [initialAgents, initialPublicModels, defaultModel, setInitialData])


  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto"
    const maxHeight = window.innerHeight * 0.3
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
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
    
    // Automatically adjust textarea height
    const target = e.target as HTMLTextAreaElement
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, window.innerHeight * 0.3) + 'px'
    
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
    console.log('=== Client: handleSubmit called ===')
    console.log('Input value:', inputValue)
    console.log('Is submitting:', isSubmitting)
    console.log('Selected model:', selectedModel)
    console.log('Current session user ID:', currentSession?.user?.id)
    

    
    if ((inputValue.trim() || uploadedImages.length > 0) && !isSubmitting && selectedModel && currentSession?.user?.email) {
      // Stop if already submitting
      if (submitInProgress.current) {
        console.log('Submit already in progress, skipping duplicate call')
        return
      }

      submitInProgress.current = true
      setIsSubmitting(true)
      
      // 🔥 React state에서 딥리서치 상태 확인 (더 안전함)
      const actualDeepResearchState = isDeepResearchActive;
      
      try {
        console.log('=== Client: Chat session creation request started ===')
        console.log('Selected model:', selectedModel)
        console.log('Initial message:', inputValue)
        console.log('Images:', uploadedImages.length)
        console.log('🔍🔍🔍 SUBMIT 시 딥리서치 상태 확인:')
        console.log('  React state isDeepResearchActive:', isDeepResearchActive)
        console.log('  Using deep research state:', actualDeepResearchState)
        console.log('  isGlobeActive:', isGlobeActive)
        
        let response: Response

        if (uploadedImages.length > 0) {
          
          // Use FormData when images are present
          const formData = new FormData()
          formData.append('message', inputValue || '')
          if (selectedModel.type === 'agent') {
            formData.append('agentId', selectedModel.id)
          } else {
            formData.append('modelId', selectedModel.id)
          }
          formData.append('modelType', selectedModel.type)
          
          // Add image files
          uploadedImages.forEach((image) => {
            formData.append('images', image)
          })
          
          formData.append('isDeepResearchActive', actualDeepResearchState.toString())
          formData.append('isGlobeActive', isGlobeActive.toString())
          
          response = await fetch('/api/chat', {
            method: 'POST',
            body: formData
          })
        } else {
          
          // Use JSON for text-only messages
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agentId: selectedModel.type === 'agent' ? selectedModel.id : undefined,
              modelId: selectedModel.type === 'model' ? selectedModel.id : undefined,
              modelType: selectedModel.type,
              initialMessage: inputValue,
              isDeepResearchActive: actualDeepResearchState,
              isGlobeActive
            })
          })
        }

        console.log('=== Client: Response received ===')
        console.log('Response status:', response.status)
        console.log('Response OK:', response.ok)
        console.log('Response headers:', response.headers)

        if (!response.ok) {
          const errorText = await response.text()
          console.log('Error response content:', errorText)
          throw new Error(`${lang('error.chat_creation_failed')} (${response.status}: ${errorText})`)
        }

        const data = await response.json()
        console.log('=== Client: Response data ===')
        console.log('Response data:', data)
        
        const chatId = data.chatId
        console.log('Chat ID:', chatId)

        // Save agent information and deep research state to localStorage (for streaming response)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`chat_${chatId}_agent`, JSON.stringify({
            id: selectedModel.id,
            type: selectedModel.type
          }))
          
          // Save deep research and globe state for chat-page.tsx
          localStorage.setItem(`chat_${chatId}_deepResearch`, actualDeepResearchState.toString())
          localStorage.setItem(`chat_${chatId}_globe`, isGlobeActive.toString())
        }

        // Add new chat to sidebar immediately
        if (typeof window !== 'undefined') {
          let chatTitle = inputValue?.trim() || lang('images.chatTitle')
          if (uploadedImages.length > 0 && !inputValue?.trim()) {
            chatTitle = lang('images.chatTitleWithImages')
              .replace('{count}', uploadedImages.length.toString())
              .replace('{plural}', uploadedImages.length > 1 ? 's' : '')
          } else if (uploadedImages.length > 0 && inputValue?.trim()) {
            chatTitle = lang('images.chatTitleWithText')
              .replace('{text}', inputValue.substring(0, 15))
              .replace('{count}', uploadedImages.length.toString())
              .replace('{plural}', uploadedImages.length > 1 ? 's' : '')
          } else {
            chatTitle = inputValue.substring(0, 20) + (inputValue.length > 20 ? '...' : '')
          }
          
          const newChatData = {
            id: chatId,
            title: chatTitle,
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

        console.log('=== Client: Navigating to chat page ===')
        console.log('Navigating to:', `/chat/${chatId}`)
        console.log('Deep research active:', isDeepResearchActive)
        console.log('Globe active:', isGlobeActive)
        console.log('Response data:', data)
        
        if (!chatId) {
          console.error('Chat ID is missing, cannot navigate')
          throw new Error(lang('error.chat_id_missing'))
        }
        
        // Navigate with URL parameters (simple and reliable)
        const urlParams = new URLSearchParams()
        if (actualDeepResearchState) {
          urlParams.set('deepResearch', 'true')
        }
        if (isGlobeActive) {
          urlParams.set('globe', 'true')
        }
        
        const targetUrl = `/chat/${chatId}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
        console.log('🚀 Navigating with URL:', targetUrl)
        console.log('🚀 Deep research state stored in localStorage:', actualDeepResearchState)
        console.log('🚀 Globe state stored in localStorage:', isGlobeActive)
        
        router.push(targetUrl)
        console.log('Navigation command sent')
        
        // Reset input field and images
        setInputValue("")
        setUploadedImages([])
        setImagePreviews([])
        setIsExpanded(false)
        
        // Reset height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
          textareaRef.current.style.height = "52px"
        }
        
      } catch (error) {
        console.error('=== Client: Chat session creation error ===')
        console.error('Error details:', error)
        if (error instanceof Error) {
          console.error('Error stack:', error.stack)
        }
        // Error handling - show notification to user
        alert(lang('error.chat_creation_failed'))
      } finally {
        setIsSubmitting(false)
        submitInProgress.current = false
      }
    } else {
      console.log('=== Client: Submit conditions not met ===')
      if (!inputValue.trim() && uploadedImages.length === 0) console.log('- Input value is empty and no images')
      if (isSubmitting) console.log('- Already submitting')
      if (!selectedModel) console.log('- No model selected')
      if (!currentSession?.user?.email) console.log('- No user session')
    }
  }, [inputValue, router, isSubmitting, selectedModel, currentSession?.user?.email])

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

  // Check if selected model supports multimodal input
  const supportsMultimodal = selectedModel ? (() => {
    if (selectedModel.type === 'agent') {
      // For agents, check both agent's supportsMultimodal and underlying model's supportsMultimodal
      const agentSupports = selectedModel.supportsMultimodal === true || selectedModel.supportsMultimodal === 1
      const modelSupports = selectedModel.modelSupportsMultimodal === true || selectedModel.modelSupportsMultimodal === 1
      return agentSupports || modelSupports
    } else if (selectedModel.type === 'model') {
      // For public models, check supportsMultimodal field
      return selectedModel.supportsMultimodal === true || selectedModel.supportsMultimodal === 1
    }
    return false
  })() : false

  // Check if agent supports features
  const supportsDeepResearch = selectedModel?.type === 'agent' ? (selectedModel as Agent).supportsDeepResearch ?? true : true
  const supportsWebSearch = selectedModel?.type === 'agent' ? (selectedModel as Agent).supportsWebSearch ?? true : true
  
  // Debug: Log deep research support
  console.log('🔍 Deep research support check:')
  console.log('  selectedModel:', selectedModel)
  console.log('  selectedModel.type:', selectedModel?.type)
  console.log('  supportsDeepResearch:', supportsDeepResearch)
  console.log('  agent.supportsDeepResearch:', selectedModel?.type === 'agent' ? (selectedModel as Agent).supportsDeepResearch : 'N/A')

  // Image resize and compression function
  const resizeAndCompressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        // Set maximum size (reduced to 512px)
        const maxSize = 512
        let { width, height } = img
        
        // Maintain aspect ratio while resizing
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to compressed image (JPEG, quality 0.6 for more compression)
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Return original if compression fails
          }
        }, 'image/jpeg', 0.6)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

            // Filter image files only
        const imageFiles = files.filter(file => file.type.startsWith('image/'))
        if (imageFiles.length === 0) {
          alert(lang("error.only_images_allowed"))
          return
        }

        // Total image count limit (max 3)
        if (uploadedImages.length + imageFiles.length > 3) {
          alert(lang("error.max_images_exceeded"))
          return
        }

    try {
      // Resize and compress all images
      const processedImages = await Promise.all(
        imageFiles.map(file => resizeAndCompressImage(file))
      )

      // Check file size after compression (2MB)
      const maxSize = 2 * 1024 * 1024
      const oversizedFiles = processedImages.filter(file => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        alert(lang("error.image_too_large"))
        return
      }

      // Create image previews
      const newPreviews: string[] = []
      const processedFiles: File[] = []

      processedImages.forEach((file, index) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          newPreviews.push(result)
          processedFiles.push(file)
          
          // Update state when all images are loaded
          if (newPreviews.length === processedImages.length) {
            setUploadedImages(prev => [...prev, ...processedFiles])
            setImagePreviews(prev => [...prev, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Image processing error:', error)
      alert(lang("error.image_processing_failed"))
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    setUploadedImages(newImages)
    setImagePreviews(newPreviews)
  }

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
    
    // Get first character
    const letter = model.type === 'agent' 
      ? ((model as Agent).name || '').charAt(0).toUpperCase()
      : ((model as PublicModel).provider || '').charAt(0).toUpperCase()
      
    return letter || 'AI'
  }
  
  // Background color determination function
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

  // Skeleton UI component
  const EmptyChatSkeleton = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full pb-32 md:pb-6 animate-pulse">
      {/* Welcome message skeleton */}
      <div className="text-center mb-8 space-y-3">
        <div className="h-6 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse mx-auto"></div>
        <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse mx-auto" style={{animationDelay: '0.1s'}}></div>
      </div>

      {/* Input area skeleton */}
      <div className="w-full max-w-3xl mb-8">
        <div className="hidden md:block">
          <div className="border border-gray-200 dark:border-gray-700 rounded-3xl p-4 space-y-3">
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.3s'}}></div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.4s'}}></div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.5s'}}></div>
                <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.6s'}}></div>
                <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.7s'}}></div>
                <div className="h-3 w-6 bg-blue-200 dark:bg-blue-800 rounded animate-skeleton-pulse" style={{animationDelay: '0.8s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt suggestions skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: `${0.9 + index * 0.1}s`}}></div>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: `${1.0 + index * 0.1}s`}}></div>
            <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: `${1.1 + index * 0.1}s`}}></div>
            <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: `${1.2 + index * 0.1}s`}}></div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {isInitialLoading && showSkeleton ? (
          <EmptyChatSkeleton />
        ) : (
          <>
            {/* Initial State Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full pb-32 md:pb-6">
              {/* User welcome message */}
              {currentSession?.user && (
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {lang("welcome.greeting").replace("{name}", currentSession.user.name)}
                  </h1>
                  {selectedModel ? (
                    <p className="text-lg text-gray-600">
                      {lang("welcome.helpMessage")}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-lg text-gray-600">
                        {lang("welcome.setupRequired")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {lang("welcome.noModelMessage")}
                      </p>
                      {currentSession.user.role === 'admin' && (
                        <Button 
                          onClick={() => router.push('/admin')}
                          className="mt-4"
                        >
                          {lang("welcome.goToAdmin")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}



          {/* Central Input Area - Only show when model is selected */}
          {selectedModel && (
          <div className="w-full max-w-3xl mb-8">
            {/* Desktop Input */}
            <div className="hidden md:block">
              <div className="flex-1 flex flex-col relative w-full shadow-lg rounded-xl border border-gray-200 hover:border-gray-300 focus-within:border-gray-300 transition bg-white">
                {/* Image previews */}
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={lang("images.uploadedImage").replace("{index}", (index + 1).toString())}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col p-2 sm:p-3">
                  {/* Text area */}
                  <div className="relative flex items-end">
                    <textarea
                      ref={textareaRef}
                      placeholder={lang("placeholder")}
                      className={`w-full rounded-lg border-0 p-1 ${supportsMultimodal ? 'pr-16 sm:pr-20' : 'pr-12 sm:pr-14'} resize-none overflow-hidden focus:outline-none focus:ring-0 text-base leading-6 min-h-[52px] max-h-[120px] sm:max-h-[180px] touch-manipulation`}
                      style={{
                        height: 'auto',
                        minHeight: '52px',
                        maxHeight: window.innerHeight * 0.4 + 'px'
                      }}
                      value={inputValue}
                      onChange={handleInputChange}
                      onInput={handleInput}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                      disabled={!selectedModel}
                    />
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      variant="default"
                      size="icon"
                      className={`absolute right-0 bottom-2 sm:bottom-3 h-6 w-6 sm:h-9 sm:w-9 rounded-full text-white bg-black hover:bg-gray-800 hover:text-white touch-manipulation`}
                      onClick={handleSubmit}
                      disabled={(!inputValue.trim() && uploadedImages.length === 0) || isSubmitting || !selectedModel}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Text length indicator */}
                  {(inputValue.length > 500 || uploadedImages.length > 0) && (
                    <div className="text-xs text-gray-500 mt-1 px-1">
                      {inputValue.length}/{uploadedImages.length > 0 ? 1000 : 4000} {lang("images.charactersLimit")}
                      {uploadedImages.length > 0 && (
                        <span className="ml-2 text-orange-600">
                          {uploadedImages.length} {lang("images.imagesLimit")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between mt-2 sm:mt-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation">
                        <Plus className="h-4 w-4" />
                      </Button>
                      {supportsMultimodal && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2">
                      <Button variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation">
                        <Mic className="h-4 w-4" />
                      </Button>
                      {supportsDeepResearch && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation ${isDeepResearchActive ? "bg-cyan-700 text-white hover:bg-cyan-800 hover:text-white" : ""}`}
                          data-testid="deep-research-toggle"
                          data-active={isDeepResearchActive}
                          onClick={() => {
                            setIsDeepResearchActive(!isDeepResearchActive)
                          }}
                          title={isDeepResearchActive ? lang("tooltips.deepResearchActive") : lang("tooltips.deepResearchInactive")}
                        >
                          <Brain className="h-4 w-4" />
                        </Button>
                      )}
                      {supportsWebSearch && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation ${isGlobeActive ? "bg-cyan-700 text-white hover:bg-cyan-800 hover:text-white" : ""}`}
                          onClick={() => setIsGlobeActive(!isGlobeActive)}
                        >
                          <Globe className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center text-gray-400 pb-2 mt-3 ">
                  {lang("disclaimer")}
                </div>
              </div>
            </div>

            {/* Mobile Input - Fixed at bottom */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 p-0 chat-input-container mobile-keyboard-adjust">
              <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto bg-white">
                <div className="flex-1 flex flex-col relative w-full shadow-lg rounded-xl border border-gray-200 hover:border-gray-300 focus-within:border-gray-300 transition bg-white">
                  {/* Image previews for mobile */}
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                                                  <img
                          src={preview}
                          alt={lang("images.uploadedImage").replace("{index}", (index + 1).toString())}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col p-2 sm:p-3">
                    {/* Text area */}
                    <div className="relative flex items-end">
                      <textarea
                        ref={textareaRef}
                        placeholder={lang("mobilePlaceholder")}
                        className={`w-full rounded-lg border-0 p-1 ${supportsMultimodal ? 'pr-16 sm:pr-20' : 'pr-12 sm:pr-14'} resize-none overflow-hidden focus:outline-none focus:ring-0 text-base leading-6 min-h-[52px] max-h-[120px] sm:max-h-[180px] touch-manipulation`}
                        style={{
                          height: 'auto',
                          minHeight: '52px',
                          maxHeight: window.innerHeight * 0.4 + 'px'
                        }}
                        value={inputValue}
                        onChange={handleInputChange}
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleKeyUp}
                        disabled={!selectedModel}
                      />
                      <Button
                        variant="default"
                        size="icon"
                        className={`absolute right-0 bottom-2 sm:bottom-3 h-6 w-6 sm:h-9 sm:w-9 rounded-full text-white bg-black hover:bg-gray-800 hover:text-white touch-manipulation`}
                        onClick={handleSubmit}
                        disabled={(!inputValue.trim() && uploadedImages.length === 0) || isSubmitting || !selectedModel}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Text length indicator */}
                    {(inputValue.length > 500 || uploadedImages.length > 0) && (
                      <div className="text-xs text-gray-500 mt-1 px-1">
                        {inputValue.length}/{uploadedImages.length > 0 ? 1000 : 4000} {lang("images.charactersLimit")}
                        {uploadedImages.length > 0 && (
                          <span className="ml-2 text-orange-600">
                            {uploadedImages.length} {lang("images.imagesLimit")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom controls */}
                    <div className="flex items-center justify-between mt-2 sm:mt-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation">
                          <Plus className="h-4 w-4" />
                        </Button>
                        {supportsMultimodal && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-2">
                        <Button variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation">
                          <Mic className="h-4 w-4" />
                        </Button>
                        {supportsDeepResearch && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation ${isDeepResearchActive ? "bg-cyan-700 text-white hover:bg-cyan-800 hover:text-white" : ""}`}
                            onClick={() => {
                              console.log('🧠 Deep research button clicked! (Mobile)')
                              console.log('  Current state:', isDeepResearchActive)
                              console.log('  New state will be:', !isDeepResearchActive)
                              setIsDeepResearchActive(!isDeepResearchActive)
                            }}
                            title={isDeepResearchActive ? lang("tooltips.deepResearchActive") : lang("tooltips.deepResearchInactive")}
                          >
                            <Brain className="h-4 w-4" />
                          </Button>
                        )}
                        {supportsWebSearch && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation ${isGlobeActive ? "bg-cyan-700 text-white hover:bg-cyan-800 hover:text-white" : ""}`}
                            onClick={() => setIsGlobeActive(!isGlobeActive)}
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center text-gray-400 pb-2 mt-3 ">
                  {lang("disclaimer")}
                </div>
              </div>
            </div>
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
          </>
        )}
      </div>
    </>
  )
}
