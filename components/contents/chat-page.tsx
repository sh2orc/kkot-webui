"use client"

import type React from "react"

import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { LlmResponse } from "@/components/chat/llm-response"
import { UserRequest } from "@/components/chat/user-request"
import { ChatInput } from "@/components/chat/chat-input"
import { useTranslation } from "@/lib/i18n"
import { useModel } from "@/components/providers/model-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { Message, ChatPageProps } from "./chat-types"
import { ChatMessageWrapper } from "./chat-message-wrapper"
import { ChatMessageSkeleton } from "./chat-message-skeleton"
import { generateUniqueId, scrollToBottomInstant, scrollToBottomSmooth } from "@/utils/chat-utils"
import { handleParallelDeepResearch } from "@/utils/deep-research"
import { sendMessageToAI } from "@/utils/chat-message-handler"

export default function ChatPage({ chatId }: ChatPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  const { lang } = useTranslation('chat')
  const { selectedModel } = useModel()
  const isMobile = useIsMobile()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [isGlobeActive, setIsGlobeActive] = useState(false)
  const [isDeepResearchActive, setIsDeepResearchActive] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set())
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set())
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0)
  
  // Track regeneration state changes globally
  useEffect(() => {
    // Update counter to force re-rendering when regeneration state changes
    setForceUpdateCounter(prev => prev + 1)
  }, [regeneratingMessageId])
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [clearImagesTrigger, setClearImagesTrigger] = useState(false)
  const [deepResearchPlannedSteps, setDeepResearchPlannedSteps] = useState<Array<{ title: string, type: string }>>([])
  // Set safer initial value
  const [dynamicPadding, setDynamicPadding] = useState(() => {
    // Use default value on server side, detect screen size on client
    if (typeof window === 'undefined') return 240
    return window.innerWidth < 768 ? 320 : 160
  })
  
  // Ref to prevent React Strict Mode duplicate execution
  const streamingInProgress = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isScrollingToBottom = useRef(false)
  const lastScrollHeight = useRef(0)
  const lastSubmittedMessage = useRef<string | null>(null)
  const lastSubmittedTime = useRef<number>(0)
  const isSubmittingRef = useRef(false) // Additional duplicate prevention
  
  // Add ref to prevent duplicate deep research calls
  const deepResearchInProgress = useRef<Set<string>>(new Set())

  // Reset padding when isMobile changes
  useEffect(() => {
    if (isMobile !== undefined) {
      const basePadding = isMobile ? 320 : 160
      setDynamicPadding(basePadding)
    }
  }, [isMobile])

  // 딥리서치 상태 완전 초기화 함수
  const resetDeepResearchState = () => {
    if (typeof window !== 'undefined' && chatId) {
      // localStorage 초기화
      localStorage.removeItem(`chat_${chatId}_deepResearch`)
      localStorage.removeItem(`chat_${chatId}_globe`)
      
      // URL 파라미터 초기화
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // React state 초기화
      setIsDeepResearchActive(false)
      setIsGlobeActive(false)
      
      console.log('🔄 딥리서치 상태가 완전히 초기화되었습니다')
    }
  }

  // 딥리서치 상태 디버깅 정보
  const getDeepResearchDebugInfo = () => {
    if (typeof window === 'undefined' || !chatId) return null
    
    const urlParams = new URLSearchParams(window.location.search)
    const urlDeepResearch = urlParams.get('deepResearch') === 'true'
    const localDeepResearch = localStorage.getItem(`chat_${chatId}_deepResearch`) === 'true'
    
    // localStorage의 모든 딥리서치 관련 키 확인
    const allDeepResearchKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('deepResearch')) {
        allDeepResearchKeys.push({
          key,
          value: localStorage.getItem(key)
        })
      }
    }
    
    return {
      urlParam: urlDeepResearch,
      localStorage: localDeepResearch,
      reactState: isDeepResearchActive,
      final: urlDeepResearch || localDeepResearch || isDeepResearchActive,
      allLocalStorageKeys: allDeepResearchKeys,
      currentChatKey: `chat_${chatId}_deepResearch`
    }
  }

  // Load initial deep research and globe state from URL parameters and localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && chatId) {
      const urlParams = new URLSearchParams(window.location.search)
      const urlDeepResearch = urlParams.get('deepResearch') === 'true'
      const urlGlobe = urlParams.get('globe') === 'true'
      
      // Also check localStorage for deep research and globe state
      const localDeepResearch = chatId ? localStorage.getItem(`chat_${chatId}_deepResearch`) === 'true' : false
      const localGlobe = chatId ? localStorage.getItem(`chat_${chatId}_globe`) === 'true' : false
      
      // Use URL parameters first, then localStorage as fallback
      const finalDeepResearch = urlDeepResearch || localDeepResearch
      const finalGlobe = urlGlobe || localGlobe
      
      // 디버깅 로그 추가
      console.log('🔍 딥리서치 상태 확인:', {
        urlParam: urlDeepResearch,
        localStorage: localDeepResearch,
        finalResult: finalDeepResearch,
        chatId
      })
      
      if (finalDeepResearch) {
        setIsDeepResearchActive(true)
      }
      
      if (finalGlobe) {
        setIsGlobeActive(true)
      }
      
      // Clean up URL parameters after reading (optional)
      if (urlDeepResearch || urlGlobe) {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [chatId])

  // Detect message container height and adjust dynamic padding
  const adjustDynamicPadding = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const containerHeight = container.clientHeight
      const scrollHeight = container.scrollHeight
      const scrollTop = container.scrollTop
      
      // Only adjust padding when scroll is near bottom
      const isNearBottom = scrollHeight - scrollTop - containerHeight < 80
      
      if (isNearBottom) {
        // Check only code blocks in the last message (to prevent excessive padding)
        const lastMessage = container.querySelector('.max-w-3xl > div:last-child')
        let additionalPadding = 0
        
        if (lastMessage) {
          const codeBlocks = lastMessage.querySelectorAll('.code-block')
          if (codeBlocks.length > 0) {
            // Consider only the height of code blocks in the last message
            const lastCodeBlock = codeBlocks[codeBlocks.length - 1]
            const rect = lastCodeBlock.getBoundingClientRect()
            
            // Add additional padding only when code block height is over 150px
            if (rect.height > 150) {
              additionalPadding = Math.min(rect.height * 0.3, 100) // Max 100px additional padding
            }
          }
        }
        
        // Base padding + limited additional padding
        const basePadding = isMobile ? 320 : 160
        const newPadding = Math.max(basePadding, basePadding + additionalPadding)
        
        // Increase threshold to prevent unnecessary padding changes
        const threshold = 30
        
        if (Math.abs(newPadding - dynamicPadding) > threshold) {
          setDynamicPadding(newPadding)
        }
      } else {
        // Restore base padding when scroll is at top
        const basePadding = isMobile ? 320 : 160
        if (dynamicPadding > basePadding) {
          setDynamicPadding(basePadding)
        }
      }
    }
  }, [dynamicPadding, isMobile])

  // Move to bottom immediately without animation
  const scrollToBottomInstantLocal = () => {
    if (messagesContainerRef.current) {
      scrollToBottomInstant(
        messagesContainerRef.current, 
        isScrollingToBottom, 
        lastScrollHeight
      )
    }
  }

  // Move to bottom smoothly with animation
  const scrollToBottomSmoothLocal = (force: boolean = false) => {
    if (messagesContainerRef.current) {
      scrollToBottomSmooth(
        messagesContainerRef.current,
        isScrollingToBottom,
        lastScrollHeight,
        force
      )
    }
  }

  const handleAbort = () => {
    console.log('🔴 handleAbort called - cleaning up all states')
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Clean up all states immediately
    streamingInProgress.current = false
    isSubmittingRef.current = false
    setIsStreaming(false)
    setIsSubmitting(false)
    setRegeneratingMessageId(null)
    setStreamingMessageId(null)
    
    // Try resetting state multiple times to ensure it's applied
    setTimeout(() => {
      console.log('=== handleAbort - First safety check ===')
      setRegeneratingMessageId(null)
      setIsStreaming(false)
      setIsSubmitting(false)
    }, 100)
    
    setTimeout(() => {
      console.log('=== handleAbort - Final safety check ===')
      setRegeneratingMessageId(null)
      setIsStreaming(false)
      setIsSubmitting(false)
    }, 500)
    
    // Prevent forced scrolling if user manually scrolled up
    const container = messagesContainerRef.current
    const userScrolled = (container as any)?.userScrolled?.() || false
    
    if (!userScrolled) {
      // Only adjust padding and scroll if user hasn't scrolled
      adjustDynamicPadding()
      scrollToBottomSmoothLocal(true) // Set force=true to ensure scroll to bottom
    }
  }

  // Handle image upload from ChatInput
  const handleImageUpload = useCallback((images: File[]) => {
    setUploadedImages(images)
  }, [])

  // Continue with new request after short delay
  // Parallel deep research processing function
  const handleParallelDeepResearchLocal = async (
    subQuestions: string[],
    originalQuery: string,
    modelId: string,
    assistantMessageId: string,
    providedChatId?: string | number
  ) => {
    return handleParallelDeepResearch(
      subQuestions,
                  originalQuery,
                  modelId,
      assistantMessageId,
      providedChatId,
      setMessages,
      deepResearchInProgress,
      setIsStreaming,
      setStreamingMessageId,
      setIsSubmitting,
      isSubmittingRef,
      streamingInProgress,
      abortControllerRef.current?.signal
    )
  }

  const sendMessageToAILocal = async (message: string, agentInfo: {id: string, type: string}, isRegeneration: boolean = false, images?: File[]) => {
    return sendMessageToAI(
      chatId,
            message,
      agentInfo,
            isRegeneration,
      images,
      session,
      isDeepResearchActive,
      isGlobeActive,
      abortControllerRef,
      streamingInProgress,
      setIsStreaming,
      setStreamingMessageId,
      setNewMessageIds,
      setMessages,
      adjustDynamicPadding,
      scrollToBottomSmoothLocal,
      handleParallelDeepResearchLocal,
      deepResearchInProgress,
      setRegeneratingMessageId,
      messagesContainerRef
    )
  }

  // Load chat history when chatId or session changes
  useEffect(() => {
    let isCancelled = false
    
    // Initialize loading state
    setHistoryLoaded(false)
    setShowSkeleton(true)
    
    // Ensure minimum skeleton UI display time (300ms)
    const minSkeletonDisplayTime = 300
    const skeletonStartTime = Date.now()
    
    if (chatId && session?.user?.email) {
      // Get chat history from API
      const loadChatHistory = async () => {
        if (isCancelled) return

        try {
          const response = await fetch(`/api/chat/${chatId}`)
          if (isCancelled) return
          
          if (response.status === 401 || response.status === 404) {
            // Redirect to homepage if authentication error or resource not found
            toast.error('Chat session not found. Redirecting to home.')
            router.push('/')
            return
          }
          
          if (response.ok) {
            const data = await response.json()
            if (isCancelled) return
            
            // Convert timestamp to Date object and process rating info
            const messagesWithDateTimestamp = (data.messages || []).map((msg: any) => {
              // Handle timestamp conversion properly for SQLite (integer) and PostgreSQL (string)
              let timestamp: Date;
              if (msg.timestamp) {
                // If timestamp is a number (SQLite), it's already in milliseconds
                // If timestamp is a string (PostgreSQL), Date constructor can handle it
                timestamp = new Date(msg.timestamp);
                // Check if the date is valid
                if (isNaN(timestamp.getTime())) {
                  // If invalid, use current time as fallback
                  timestamp = new Date();
                }
              } else {
                // If no timestamp, use current time
                timestamp = new Date();
              }
              
              return {
                ...msg,
                timestamp
              };
            })
            
            // Load rating information from messages
            const likedMessageIds = new Set<string>()
            const dislikedMessageIds = new Set<string>()
            
            messagesWithDateTimestamp.forEach((msg: any) => {
              if (msg.rating === 1) {
                likedMessageIds.add(msg.id)
              } else if (msg.rating === -1) {
                dislikedMessageIds.add(msg.id)
              }
            })
            
            // Update rating states
            setLikedMessages(likedMessageIds)
            setDislikedMessages(dislikedMessageIds)
            
            // Process messages in a non-blocking way
            const processMessages = () => {
              return new Promise<void>((resolve) => {
                if (isCancelled) {
                  resolve()
                  return
                }
                
                // Process messages consistently regardless of count
                // Set messages directly instead of initializing with empty array
                setMessages(messagesWithDateTimestamp)
                
                // Auto-generate AI response if last message is user message AND there's agent info in localStorage
                // This only happens for newly created chats where user message was just sent
                const agentInfo = localStorage.getItem(`chat_${chatId}_agent`)
                if (messagesWithDateTimestamp.length > 0 && !streamingInProgress.current && agentInfo) {
                  const lastMessage = messagesWithDateTimestamp[messagesWithDateTimestamp.length - 1]
                  
                  // Only generate response if:
                  // 1. Last message is from user
                  // 2. There's exactly 1 message (first conversation)
                  // 3. Agent info exists in localStorage
                                    if (lastMessage.role === 'user' && messagesWithDateTimestamp.length === 1) {
                    if (!isCancelled) {
                      const parsedAgentInfo = JSON.parse(agentInfo)
                      
                      // Check URL parameters and localStorage for deep research state (to avoid React state timing issues)
                      const urlParams = new URLSearchParams(window.location.search)
                      const urlDeepResearch = urlParams.get('deepResearch') === 'true'
                      const urlGlobe = urlParams.get('globe') === 'true'
                      
                      // Also check localStorage for deep research and globe state
                      const localDeepResearch = chatId ? localStorage.getItem(`chat_${chatId}_deepResearch`) === 'true' : false
                      const localGlobe = chatId ? localStorage.getItem(`chat_${chatId}_globe`) === 'true' : false
                      
                      // Use URL parameters first, then localStorage, then React state as fallback
                      const finalDeepResearch = urlDeepResearch || localDeepResearch || isDeepResearchActive
                      const finalGlobe = urlGlobe || localGlobe || isGlobeActive
                      
                      // Temporarily update React state if URL params or localStorage indicate different values
                      if ((urlDeepResearch || localDeepResearch) && !isDeepResearchActive) {
                        setIsDeepResearchActive(true)
                      }
                      if ((urlGlobe || localGlobe) && !isGlobeActive) {
                        setIsGlobeActive(true)
                      }
                      
                      // Extract images from user message if present and call streaming API
                      const processImagesAndSendMessage = async () => {
                        let messageContent = lastMessage.content
                        let imagesToSend: File[] = []
                        
                        try {
                          // Check if message contains JSON with images
                          const parsed = JSON.parse(lastMessage.content)
                          if (parsed.hasImages && parsed.images && Array.isArray(parsed.images)) {
                            messageContent = parsed.text || ''
                            
                            // Convert base64 data back to File objects
                            imagesToSend = await Promise.all(
                              parsed.images.map(async (imageInfo: any) => {
                                if (imageInfo.data) {
                                  // Convert base64 data URL to Blob then to File
                                  const response = await fetch(imageInfo.data)
                                  const blob = await response.blob()
                                  return new File([blob], imageInfo.name || 'image.png', { 
                                    type: imageInfo.mimeType || 'image/png' 
                                  })
                                }
                                return null
                              })
                            ).then(files => files.filter(file => file !== null) as File[])
                            

                          }
                        } catch (e) {
                          // If JSON parsing fails, treat as plain text
                          messageContent = lastMessage.content
                        }
                        
                        // Call streaming API with isRegeneration=true to prevent duplicate user message saving
                        sendMessageToAILocal(messageContent, parsedAgentInfo, true, imagesToSend)
                      }
                      
                      // Execute the async function
                      processImagesAndSendMessage()
                      
                      // Clean up localStorage after use (delay to prevent race condition)
                      setTimeout(() => {
                        localStorage.removeItem(`chat_${chatId}_agent`)
                        localStorage.removeItem(`chat_${chatId}_deepResearch`)
                        localStorage.removeItem(`chat_${chatId}_globe`)
                      }, 1000)
                    }
                  } else {
                    // Clean up localStorage if it exists but we're not using it
                    localStorage.removeItem(`chat_${chatId}_agent`)
                  }
                }
                
                // Always resolve the promise
                resolve()
              })
            }
            
            // Process messages asynchronously
            await processMessages()
          } else {
            console.error('Failed to load chat history')
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('Chat history load error:', error)
          }
        } finally {
          if (!isCancelled) {
            // Ensure minimum skeleton UI display time (300ms)
            const elapsedTime = Date.now() - skeletonStartTime
            const remainingTime = Math.max(0, minSkeletonDisplayTime - elapsedTime)
            
            setTimeout(() => {
              if (!isCancelled) {
                // Prevent render blocking when there are many messages
                requestAnimationFrame(() => {
                  setHistoryLoaded(true) // Mark history load as completed
                  setShowSkeleton(false) // Hide skeleton UI
                  
                  // Move to bottom immediately after content is loaded (without animation)                  
                  // Final scroll processing
                  setTimeout(() => {
                    scrollToBottomInstantLocal()
                  }, 100)
                })
              }
            }, remainingTime)
          }
        }
      }

      loadChatHistory()
    } else {
      // If chatId or session is missing, handle loading completion after minimum time
      const elapsedTime = Date.now() - skeletonStartTime
      const remainingTime = Math.max(0, minSkeletonDisplayTime - elapsedTime)
      
      setTimeout(() => {
        if (!isCancelled) {
          requestAnimationFrame(() => {
            setHistoryLoaded(true)
            setShowSkeleton(false)
          })
        }
      }, remainingTime)
    }

    // Cleanup function
    return () => {
      isCancelled = true
    }
  }, [chatId, session?.user?.email, isMobile])

  // Auto-send first message logic is handled in loadChatHistory useEffect above
  // This useEffect was causing duplicate message generation and has been removed

  // Handle session status changes
  useEffect(() => {
    // Reset history load state when session changes
    if (!session?.user?.email) {
      setHistoryLoaded(false)
      setShowSkeleton(false)
      setMessages([])
    }
  }, [session?.user?.email])

  // Handle scroll on message change (also works when chat ID changes)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    if (messages.length > 0) {
      // Check if user manually scrolled
      const container = messagesContainerRef.current
      const userScrolled = (container as any)?.userScrolled?.() || false
      
      if (isInitialLoad) {
        // On initial load, scroll to bottom regardless of user scroll state
        setTimeout(() => scrollToBottomInstantLocal(), 100)
        setIsInitialLoad(false)
      } else if (!userScrolled || isStreaming) {
        // Scroll only if user didn't scroll or streaming is in progress
        setTimeout(() => scrollToBottomSmoothLocal(true), 100)
        // If not streaming, minimize additional scroll
        if (isStreaming) {
          setTimeout(() => scrollToBottomInstantLocal(), 100)
        }
      }
      
      // Adjust padding regardless of user scroll state
      setTimeout(() => adjustDynamicPadding(), 200)
      
      // Clean up new message IDs after animation completes
      setTimeout(() => {
        setNewMessageIds(new Set())
      }, 1000)
    }
  }, [messages, isInitialLoad, adjustDynamicPadding, isStreaming])
  
  // Reset to initial load state when chatId changes
  useEffect(() => {
    setIsInitialLoad(true)
    const basePadding = isMobile !== undefined ? (isMobile ? 320 : 160) : 240
    setDynamicPadding(basePadding) // Reset padding too
  }, [chatId, isMobile])

  // Check if selected model supports multimodal input
  const supportsMultimodal = useMemo(() => {
    if (!selectedModel) return false
    
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
  }, [selectedModel])

  // Add scroll event listener - prevent auto scroll when user scrolls
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout | null = null
    let userScrolled = false

    const handleScroll = () => {
      // Optimize scroll event debouncing for performance
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      scrollTimeout = setTimeout(() => {
        // Check if user manually scrolled
        if (!isScrollingToBottom.current) {
          const { scrollTop, scrollHeight, clientHeight } = container
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 80
          
          // Set userScrolled flag if user scrolled up
          if (!isAtBottom) {
            userScrolled = true
            // Ensure rendering stability when scrolling up
            container.style.contentVisibility = 'auto'
          } else {
            // Reset userScrolled flag if user scrolled back to bottom
            userScrolled = false
          }
        }
      }, 16) // Debounce for 60fps
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // Save userScrolled state to container for other functions to access
    ;(container as any).userScrolled = () => userScrolled
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [])

  // Use ResizeObserver to detect content size changes and auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Don't auto-scroll if user has manually scrolled up
        const userScrolled = (container as any).userScrolled?.() || false
        if (userScrolled && !isStreaming) {
          // Prevent auto-scroll if not streaming and user has scrolled
          return
        }
        
        // Auto-scroll if user is near bottom when content size changes
        const { scrollTop, scrollHeight, clientHeight } = container
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
        
        if (isNearBottom && !isScrollingToBottom.current) {
          // Short delay before scrolling (wait for DOM updates)
          setTimeout(() => {
            scrollToBottomInstantLocal()
          }, 100)
        }
      }
    })

    // Observe message container
    resizeObserver.observe(container)
    
    // Also observe inner content container
    const innerContainer = container.querySelector('.max-w-full')
    if (innerContainer) {
      resizeObserver.observe(innerContainer)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [isStreaming])

  // Clean up streaming on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      streamingInProgress.current = false
      setIsStreaming(false)
    }
  }, [])

  const adjustHeight = () => {
    // Use fixed height
  }

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    
    // Automatically adjust textarea height
    const target = e.target as HTMLTextAreaElement
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, window.innerHeight * 0.3) + 'px'
  }, [])

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
  }, [])

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false)
  }, [])

  const handleCopyMessage = useCallback((content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    // Reset copy state after 2 seconds
    setTimeout(() => {
      setCopiedMessageId(null)
    }, 2000)
  }, [])

  const handleLikeMessage = useCallback(async (messageId: string) => {
    const isCurrentlyLiked = likedMessages.has(messageId)
    const newRating = isCurrentlyLiked ? 0 : 1
    
    // Optimistic update
    setLikedMessages((prev) => {
      const newSet = new Set(prev)
      if (isCurrentlyLiked) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
        // Remove dislike when liking
        setDislikedMessages((prevDisliked) => {
          const newDislikedSet = new Set(prevDisliked)
          newDislikedSet.delete(messageId)
          return newDislikedSet
        })
      }
      return newSet
    })

    // API call
    try {
      const response = await fetch(`/api/chat/${chatId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          rating: newRating
        })
      })

      if (response.status === 401 || response.status === 404) {
        // Redirect to homepage if authentication error or resource not found
        router.push('/')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update rating')
      }
    } catch (error) {
      console.error('Error updating like:', error)
      // Rollback on failure
      setLikedMessages((prev) => {
        const newSet = new Set(prev)
        if (isCurrentlyLiked) {
          newSet.add(messageId)
        } else {
          newSet.delete(messageId)
        }
        return newSet
      })
    }
  }, [chatId, likedMessages, router])

  const handleDislikeMessage = useCallback(async (messageId: string) => {
    const isCurrentlyDisliked = dislikedMessages.has(messageId)
    const newRating = isCurrentlyDisliked ? 0 : -1
    
          // Optimistic update
    setDislikedMessages((prev) => {
      const newSet = new Set(prev)
      if (isCurrentlyDisliked) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
        // Remove like when disliking
        setLikedMessages((prevLiked) => {
          const newLikedSet = new Set(prevLiked)
          newLikedSet.delete(messageId)
          return newLikedSet
        })
      }
      return newSet
    })

    // API call
    try {
      const response = await fetch(`/api/chat/${chatId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          rating: newRating
        })
      })

      if (response.status === 401 || response.status === 404) {
        // Redirect to homepage if authentication error or resource not found
        router.push('/')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update rating')
      }
    } catch (error) {
      console.error('Error updating dislike:', error)
      // Rollback on failure
      setDislikedMessages((prev) => {
        const newSet = new Set(prev)
        if (isCurrentlyDisliked) {
          newSet.add(messageId)
        } else {
          newSet.delete(messageId)
        }
        return newSet
      })
    }
  }, [chatId, dislikedMessages, router])

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
    setSelectedMessageId(null)
  }, [])

  const handleSaveEdit = (messageId: string) => {
    // Update message content
    const updatedMessages = messages.map((msg) => 
      msg.id === messageId ? { ...msg, content: editingContent } : msg
    )
    setMessages(updatedMessages)
    
    // Reset edit state
    setEditingMessageId(null)
    const savedContent = editingContent
    setEditingContent("")

    // If edited message is from user, delete all subsequent messages and regenerate
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    const editedMessage = messages[messageIndex]
    
    if (editedMessage && editedMessage.role === "user" && selectedModel && chatId && session?.user?.email) {
      // Stop streaming if in progress
      if (isStreaming) {
        handleAbort()
      }
      
      // Set regeneration state for the user message
      setRegeneratingMessageId(messageId)
      
      // Remove all messages after the user message (edited user message is kept)
      setTimeout(() => {
        setMessages(prev => prev.slice(0, messageIndex + 1))
        
        // Scroll to current position
        setTimeout(() => scrollToBottomSmoothLocal(), 100)

        // Regenerate AI with edited content
        setTimeout(() => {
          // Duplicate prevention logic initialization
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          sendMessageToAILocal(savedContent, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300)
      }, 100) // Wait after message update
    }
  }

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingContent("")
  }, [])

  const handleRegenerateResponse = (messageId: string) => {
    // If streaming is in progress, abort first
    if (isStreaming) {
      handleAbort()
    }
    
    // Remove all messages after the AI response message and regenerate
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex > 0 && selectedModel && chatId && session?.user?.email) {
      const previousUserMessage = messages[messageIndex - 1]
      if (previousUserMessage.role === "user") {
        // Set regeneration state for the user message
        setRegeneratingMessageId(previousUserMessage.id)
        
        // Remove all messages after the AI response message (user message is kept)
        setMessages(messages.slice(0, messageIndex))
        
        // Scroll to current position
        setTimeout(() => scrollToBottomSmoothLocal(), 100)

        // Initialize regeneration state and request AI
        setTimeout(() => {
          // Duplicate prevention logic initialization
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          sendMessageToAILocal(previousUserMessage.content, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300) // Wait for regeneration completion
      }
    }
  }

  const handleRegenerateFromUserMessage = async (messageId: string) => {
    
    // If streaming is in progress, abort first
    if (isStreaming) {
      handleAbort()
    }
    
    // Remove all messages after the user message and regenerate
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex >= 0 && selectedModel && chatId && session?.user?.email) {
      const userMessage = messages[messageIndex]
      if (userMessage.role === "user") {
        // Set regeneration state for the user message
        setRegeneratingMessageId(messageId)
        
        // Check if there are any messages after the user message
        const nextMessageIndex = messageIndex + 1
        if (nextMessageIndex < messages.length) {
          const nextMessage = messages[nextMessageIndex]
          
          try {
            
            // Delete all messages after the user message from the database
            const response = await fetch(`/api/chat/${chatId}?userId=${session.user.email}&fromMessageId=${nextMessage.id}`, {
              method: 'DELETE'
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to delete messages from database: ${response.status} ${errorData.error || response.statusText}`);
            }
            
            const deleteResult = await response.json();
            
            if (deleteResult.success) {
              // Verify that the messages were actually deleted after the deletion operation is complete
              if (deleteResult.deletedCount > 0) {
                
                // Check if the messages were actually deleted after the deletion operation is complete
                setTimeout(async () => {
                  try {
                    const verifyResponse = await fetch(`/api/chat/${chatId}`);
                    if (verifyResponse.ok) {
                      const verifyData = await verifyResponse.json();
                      const currentMessages = verifyData.messages || [];
                      
                      // Check if the deleted message still exists
                      const deletedMessageStillExists = currentMessages.some((msg: any) => msg.id === nextMessage.id);
                      
                      if (deletedMessageStillExists) {
                        console.error('ERROR: Deleted message still exists in database!');
                      }
                    }
                  } catch (verifyError) {
                    console.error('Failed to verify deletion:', verifyError);
                  }
                }, 1000);
              }
            }
          } catch (error) {
            console.error('Error deleting messages from database:', error);
            
            // Even if the database deletion fails, the UI will proceed
          }
        }
        
        // Remove all messages after the user message (user message is kept)
        setMessages(messages.slice(0, messageIndex + 1))
        
        // Scroll to current position
        setTimeout(() => scrollToBottomSmoothLocal(), 100)

        // Initialize regeneration state and request AI
        setTimeout(async () => {
          
          // Duplicate prevention logic initialization
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          // Extract image information from the user message
          let messageContent = userMessage.content
          let imagesToSend: File[] = []
          
          try {
            // Extract image information from the message stored in JSON format
            const parsed = JSON.parse(userMessage.content)
            if (parsed.hasImages && parsed.images && Array.isArray(parsed.images)) {
              messageContent = parsed.text || ''
              // Convert Base64 data to File object
              imagesToSend = await Promise.all(
                parsed.images.map(async (imageInfo: any) => {
                  if (imageInfo.data) {
                    // Convert Base64 data to Blob
                    const response = await fetch(imageInfo.data)
                    const blob = await response.blob()
                    // Convert Blob to File object
                    return new File([blob], imageInfo.name || 'image.png', { 
                      type: imageInfo.mimeType || 'image/png' 
                    })
                  }
                  return null
                })
              ).then(files => files.filter(file => file !== null) as File[])
            }
          } catch (e) {
            // If JSON parsing fails, process as text
            messageContent = userMessage.content
          }
          
          try {
            await sendMessageToAILocal(messageContent, {
              id: selectedModel.id,
              type: selectedModel.type
            }, true, imagesToSend)
          } catch (error) {
            console.error('Error in sendMessageToAI during regeneration:', error)
            // Reset state if error occurs during regeneration
            setRegeneratingMessageId(null)
            setIsStreaming(false)
            streamingInProgress.current = false
          }
        }, 300) // Short delay to complete abort processing
      }
    }
  }

  const handleSubmit = useCallback(async () => {
    // Block if already submitting (double check)
    if (isSubmitting || isSubmittingRef.current) {
      return
    }
    
    // Check for duplicate messages (same message sent within 500ms)
    const currentTime = Date.now()
    const messageToCheck = inputValue.trim() || 'IMAGE_ONLY'
    
    if (lastSubmittedMessage.current === messageToCheck && 
        currentTime - lastSubmittedTime.current < 500) {
      return
    }
    
    // Check for empty message (no text and no images)
    if (!inputValue.trim() && uploadedImages.length === 0) {
      return
    }
    
    // Set submission start flag
    isSubmittingRef.current = true
    
    // If streaming is in progress, abort first
    if (isStreaming) {
      handleAbort()
    }
    
    if ((inputValue.trim() || uploadedImages.length > 0) && selectedModel && chatId && session?.user?.email) {
      try {
        // Set submission flag during sending
        setIsSubmitting(true)
        
        // Reset regeneration state when sending a new message
        setRegeneratingMessageId(null)
        
        // Update duplicate prevention information
        lastSubmittedMessage.current = messageToCheck
        lastSubmittedTime.current = currentTime
      
      // Prepare images and message content to send
      const imagesToSend = [...uploadedImages]
      const messageContent = inputValue
      
      // Create user message content (includes image information)
      let userMessageContent = inputValue || ''
      
      // If there are images, store them in JSON format (parsed from UserRequest)
      if (imagesToSend.length > 0) {
        const imageInfos = await Promise.all(
          imagesToSend.map(async (image) => {
            // Include base64 data for user message display
            const reader = new FileReader()
            const base64 = await new Promise<string>((resolve) => {
              reader.onload = (e) => resolve(e.target?.result as string)
              reader.readAsDataURL(image)
            })
            
            return {
              type: 'image',
              name: image.name,
              size: image.size,
              mimeType: image.type,
              data: base64
            }
          })
        )
        
        userMessageContent = JSON.stringify({
          text: inputValue || '',
          images: imageInfos,
          hasImages: true
        })
      }

      // Add message (includes image information)
      const newUserMessage: Message = {
        id: generateUniqueId("user"),
        role: "user" as const,
        content: userMessageContent,
        timestamp: new Date(),
      }

      // Add new message ID
      setNewMessageIds(prev => new Set([...prev, newUserMessage.id]))
      setMessages([...messages, newUserMessage])
      
      // Reset input state
      setInputValue("")
      setUploadedImages([]) // Reset image state
      
      // Reset ChatInput image
      setClearImagesTrigger(prev => !prev)
      
      // Force reset text input (remove Korean IME combination)
      // Wait a moment and then initialize to complete IME combination
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.value = ""
          textareaRef.current.style.height = "auto"
          textareaRef.current.style.height = "52px"
          
          // Synchronize React state
          setInputValue("")
        }
      }, 0)
      
      // Scroll after adding message (only if user hasn't manually scrolled)
      const container = messagesContainerRef.current
      const userScrolled = (container as any)?.userScrolled?.() || false
      
      if (!userScrolled) {
        scrollToBottomSmoothLocal()
      }

      // If streaming is aborted, wait a moment and then send new message
      const sendMessage = () => {
        sendMessageToAILocal(messageContent, {
          id: selectedModel.id,
          type: selectedModel.type
        }, false, imagesToSend).finally(() => {
          // Release flag after sending
          setIsSubmitting(false)
          isSubmittingRef.current = false
        })
      }
      
        if (isStreaming) {
          // Send after a short delay to complete streaming abort processing
          setTimeout(sendMessage, 100)
        } else {
          // Send immediately
          sendMessage()
        }
      } catch (error) {
        console.error('Error in handleSubmit:', error)
        // Release flag on error
        setIsSubmitting(false)
        isSubmittingRef.current = false
      }
    }
  }, [inputValue, uploadedImages, messages, selectedModel, chatId, session?.user?.email, isStreaming, isSubmitting, scrollToBottomSmoothLocal, handleAbort, sendMessageToAILocal])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
    }

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Allow line break with Shift + Enter (default behavior)
        return
      } else {
        // Submit on Enter only
        e.preventDefault()
        
        // Check if IME composition is in progress
        if (e.nativeEvent.isComposing || isComposing) {
          // Wait if composition is in progress
          return
        }
        
        // Execute immediately (removed setTimeout to prevent duplicate execution)
        handleSubmit()
      }
    }
  }, [handleSubmit, isComposing])

  // Define message rendering outside conditional rendering to maintain Hook order
  const renderedMessages = useMemo(() => {
    
    return messages.map((message, index) => (
      <ChatMessageWrapper
        key={`${message.id}-${forceUpdateCounter}-${regeneratingMessageId || 'none'}`}
        message={message}
        isNewMessage={newMessageIds.has(message.id)}
        copiedMessageId={copiedMessageId}
        likedMessages={likedMessages}
        dislikedMessages={dislikedMessages}
        isStreaming={isStreaming}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        regeneratingMessageId={regeneratingMessageId}
        streamingMessageId={streamingMessageId}
        onCopy={handleCopyMessage}
        onLike={handleLikeMessage}
        onDislike={handleDislikeMessage}
        onRegenerate={handleRegenerateResponse}
        onEdit={handleEditMessage}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        onRegenerateFromUser={handleRegenerateFromUserMessage}
        setEditingContent={setEditingContent}
      />
    ))
  }, [messages, newMessageIds, copiedMessageId, likedMessages, dislikedMessages, isStreaming, editingMessageId, editingContent, regeneratingMessageId, streamingMessageId, forceUpdateCounter]
  )

  // Redirect if not authenticated
  if (sessionStatus === "unauthenticated") {
    router.push('/auth')
    return null
  }

  return (
    <>
      {/* Message container */}
      <div className="flex-1 flex flex-col px-1 relative overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="messages-container flex-1 overflow-y-auto sm:p-4 md:p-6 transition-all duration-200 ease-out mobile-scroll touch-scroll"
          style={{ 
            scrollBehavior: 'smooth',
            paddingBottom: `${dynamicPadding}px`,
            overflowAnchor: 'none'
          }}
        >
          <div className="px-3 max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
            {(() => {
              
              if (!historyLoaded && showSkeleton) {
                return <ChatMessageSkeleton />
              } else if (!historyLoaded && !showSkeleton) {
                return <div></div>
              } else {
                return renderedMessages
              }
            })()}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input container - fixed position */}
          <ChatInput
            inputValue={inputValue}
            textareaRef={textareaRef}
            isGlobeActive={isGlobeActive}
            isDeepResearchActive={isDeepResearchActive}
            isStreaming={isStreaming}
            isSubmitting={isSubmitting}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            handleKeyUp={handleKeyUp}
            handleCompositionStart={handleCompositionStart}
            handleCompositionEnd={handleCompositionEnd}
            handleSubmit={handleSubmit}
            handleAbort={handleAbort}
            setIsGlobeActive={setIsGlobeActive}
            setIsDeepResearchActive={setIsDeepResearchActive}
            onImageUpload={handleImageUpload}
            clearImages={clearImagesTrigger}
            supportsMultimodal={supportsMultimodal}
            selectedAgent={selectedModel?.type === 'agent' ? selectedModel : null}
          />

          {/* 딥리서치 디버깅 도구 (임시) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
              <details className="text-sm">
                <summary className="cursor-pointer font-medium mb-2 text-yellow-800 dark:text-yellow-200">
                  🔍 딥리서치 디버깅 정보
                </summary>
                <div className="space-y-2 text-xs text-yellow-700 dark:text-yellow-300">
                  {(() => {
                    const debugInfo = getDeepResearchDebugInfo()
                    if (!debugInfo) return <div>디버깅 정보를 가져올 수 없습니다.</div>
                    
                    return (
                      <>
                        <div>URL 파라미터: {debugInfo.urlParam ? '✅ true' : '❌ false'}</div>
                        <div>현재 채팅 localStorage ({debugInfo.currentChatKey}): {debugInfo.localStorage ? '✅ true' : '❌ false'}</div>
                        <div>React State: {debugInfo.reactState ? '✅ true' : '❌ false'}</div>
                        
                        <div className="pt-1 border-t border-yellow-300 dark:border-yellow-700">
                          <div className="font-medium">
                            최종 결과: {debugInfo.final ? '🔴 딥리서치 활성화됨' : '🟢 딥리서치 비활성화됨'}
                          </div>
                        </div>
                        
                        {debugInfo.allLocalStorageKeys.length > 0 && (
                          <div className="pt-1 border-t border-yellow-300 dark:border-yellow-700">
                            <div className="font-medium mb-1">모든 딥리서치 localStorage 키:</div>
                            {debugInfo.allLocalStorageKeys.map((item, index) => (
                              <div key={index} className="pl-2 text-xs">
                                • {item.key}: {item.value}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="pt-2 space-x-2">
                          <button
                            onClick={resetDeepResearchState}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                          >
                            🔄 현재 채팅 초기화
                          </button>
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                // 모든 딥리서치 관련 localStorage 키 삭제
                                const keysToRemove = []
                                for (let i = 0; i < localStorage.length; i++) {
                                  const key = localStorage.key(i)
                                  if (key && key.includes('deepResearch')) {
                                    keysToRemove.push(key)
                                  }
                                }
                                keysToRemove.forEach(key => localStorage.removeItem(key))
                                
                                // URL 파라미터 초기화
                                const newUrl = window.location.pathname
                                window.history.replaceState({}, '', newUrl)
                                
                                // React state 초기화
                                setIsDeepResearchActive(false)
                                setIsGlobeActive(false)
                                
                                console.log('🔄 모든 딥리서치 상태가 완전히 초기화되었습니다')
                              }
                            }}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs"
                          >
                            🗑️ 전체 초기화
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </details>
            </div>
          )}
      </div>
    </>
  )
}
