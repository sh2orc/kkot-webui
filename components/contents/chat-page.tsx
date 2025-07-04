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

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatPageProps {
  chatId?: string
}

// Memoized message wrapper component
const MessageWrapper = memo(({ 
  message, 
  isNewMessage, 
  copiedMessageId, 
  likedMessages, 
  dislikedMessages, 
  isStreaming, 
  editingMessageId, 
  editingContent, 
  regeneratingMessageId,
  streamingMessageId,
  onCopy, 
  onLike, 
  onDislike, 
  onRegenerate, 
  onEdit, 
  onSave, 
  onCancel, 
  onRegenerateFromUser, 
  setEditingContent 
}: {
  message: Message
  isNewMessage: boolean
  copiedMessageId: string | null
  likedMessages: Set<string>
  dislikedMessages: Set<string>
  isStreaming: boolean
  editingMessageId: string | null
  editingContent: string
  regeneratingMessageId: string | null
  streamingMessageId: string | null
  onCopy: (content: string, messageId: string) => void
  onLike: (messageId: string) => void
  onDislike: (messageId: string) => void
  onRegenerate: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onSave: (messageId: string) => void
  onCancel: () => void
  onRegenerateFromUser: (messageId: string) => void
  setEditingContent: (content: string) => void
}) => {
  return (
    <div 
      className={`message-item mb-6 ${isNewMessage ? 'message-enter' : ''} ${message.role === "user" ? "flex justify-end" : ""}`}
    >
      {message.role === "assistant" && (
        <LlmResponse
          id={message.id}
          content={message.content}
          timestamp={message.timestamp}
          onCopy={onCopy}
          onLike={onLike}
          onDislike={onDislike}
          onRegenerate={onRegenerate}
          copiedMessageId={copiedMessageId}
          likedMessages={likedMessages}
          dislikedMessages={dislikedMessages}
          isStreaming={isStreaming && streamingMessageId === message.id}
        />
      )}

      {message.role === "user" && (
        <UserRequest
          id={message.id}
          content={message.content}
          timestamp={message.timestamp}
          onCopy={onCopy}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          onRegenerate={onRegenerateFromUser}
          editingMessageId={editingMessageId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          copiedMessageId={copiedMessageId}
          isStreaming={isStreaming}
          regeneratingMessageId={regeneratingMessageId}
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Only rerender if message content hasn't changed and only state related to this message has changed
  const message = prevProps.message
  const nextMessage = nextProps.message
  
  // Message content has changed, rerender
  if (message.id !== nextMessage.id || message.content !== nextMessage.content) {
    return false
  }
  
  // Current message is streaming, rerender
  if (nextProps.streamingMessageId === message.id) {
    return false
  }
  
  // Current message is being edited, rerender
  if (nextProps.editingMessageId === message.id) {
    return false
  }
  
  // Current message is being regenerated, rerender
  if (nextProps.regeneratingMessageId === message.id) {
    return false
  }
  
  // Current message has been copied, rerender
  if (nextProps.copiedMessageId === message.id) {
    return false
  }
  
  // Current message is new, rerender
  if (nextProps.isNewMessage !== prevProps.isNewMessage) {
    return false
  }
  
  // Like/dislike state has changed, rerender
  if (nextProps.likedMessages.has(message.id) !== prevProps.likedMessages.has(message.id) ||
      nextProps.dislikedMessages.has(message.id) !== prevProps.dislikedMessages.has(message.id)) {
    return false
  }
  
  // Don't rerender in other cases
  return true
})

// Chat message skeleton component
const ChatMessageSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* First AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse"></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '0.1s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="h-4 w-[95%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.3s'}}></div>
            <div className="h-4 w-[85%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.4s'}}></div>
            <div className="h-4 w-[92%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="h-4 w-[78%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.6s'}}></div>
          </div>
        </div>
      </div>

      {/* Second AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse" style={{animationDelay: '0.7s'}}></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '0.8s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-[90%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.9s'}}></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.0s'}}></div>
            <div className="h-4 w-[87%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.1s'}}></div>
            <div className="h-4 w-[65%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.2s'}}></div>
          </div>
        </div>
      </div>

      {/* Third AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse" style={{animationDelay: '1.3s'}}></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '1.4s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-[82%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.5s'}}></div>
            <div className="h-4 w-[96%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.6s'}}></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.7s'}}></div>
            <div className="h-4 w-[89%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.8s'}}></div>
            <div className="h-4 w-[75%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.9s'}}></div>
            <div className="h-4 w-[91%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '2.0s'}}></div>
            <div className="h-4 w-[68%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '2.1s'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [isFlaskActive, setIsFlaskActive] = useState(false)
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
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [clearImagesTrigger, setClearImagesTrigger] = useState(false)
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

  // Reset padding when isMobile changes
  useEffect(() => {
    if (isMobile !== undefined) {
      const basePadding = isMobile ? 320 : 160
      setDynamicPadding(basePadding)
    }
  }, [isMobile])

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

  // Generate unique ID
  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Adjust padding and scroll when streaming stops
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    streamingInProgress.current = false
    setIsStreaming(false)
    setRegeneratingMessageId(null)
    setStreamingMessageId(null)
    
    // Adjust padding and scroll
    adjustDynamicPadding()
    scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom
  }

  // Handle image upload from ChatInput
  const handleImageUpload = useCallback((images: File[]) => {
    setUploadedImages(images)
  }, [])

  // Continue with new request after short delay
  const sendMessageToAI = async (message: string, agentInfo: {id: string, type: string}, isRegeneration: boolean = false, images?: File[]) => {
    if (!session?.user?.id) {
      console.error('User authentication required')
      return
    }

    // Abort if already streaming and start new request
    if (streamingInProgress.current) {
      handleAbort()
      // Wait briefly after message update
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Enhanced duplicate prevention using message content + timestamp
    const currentTime = Date.now()
    const messageKey = `${message}_${images?.length || 0}_${isRegeneration}`
    const lastMessageData = sessionStorage.getItem(`lastMessage_${chatId}`)
    
    if (lastMessageData) {
      try {
        const { message: lastMsg, timestamp: lastTime } = JSON.parse(lastMessageData)
        // Block if same message within 2 seconds
        if (lastMsg === messageKey && currentTime - lastTime < 2000) {
          console.log('Duplicate AI request blocked:', messageKey)
          return
        }
      } catch (e) {
        // If parsing fails, continue with old logic
        if (lastMessageData === messageKey) {
          console.log('Duplicate AI request blocked (fallback):', messageKey)
          return
        }
      }
    }
    
    sessionStorage.setItem(`lastMessage_${chatId}`, JSON.stringify({
      message: messageKey,
      timestamp: currentTime
    }))

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    streamingInProgress.current = true
    setIsStreaming(true)
    
    // Adjust padding and scroll
    adjustDynamicPadding()
    scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom

    try {
      let response: Response

      if (images && images.length > 0) {
        // Use FormData when images are present
        const formData = new FormData()
        formData.append('message', message)
        formData.append('agentId', agentInfo.id)
        formData.append('modelType', agentInfo.type)
        formData.append('isRegeneration', isRegeneration.toString())
        
        // Add image files
        images.forEach((image) => {
          formData.append('images', image)
        })
        
        // Add userId for authentication
        formData.append('userId', session?.user?.id || '')
        
        response = await fetch(`/api/chat/${chatId}`, {
          method: 'POST',
          body: formData
        })
      } else {
        // Use JSON for text-only messages
        response = await fetch(`/api/chat/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            agentId: agentInfo.id,
            modelType: agentInfo.type,
            isRegeneration,
            userId: session?.user?.id
          })
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API response error:', errorText)
        throw new Error(`Message sending failed (${response.status}: ${errorText})`)
      }

      // Process streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let assistantContent = ''
        let assistantMessageId = ''

        const processStream = async () => {
          try {
            while (true) {
              if (abortController.signal.aborted) {
                break
              }

              const { done, value } = await reader.read()
              if (done) {
                break
              }

              const chunk = decoder.decode(value)
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    
                    if (data.error) {
                      console.error('AI response error:', data.error)
                      break
                    }

                    if (data.messageId && !assistantMessageId) {
                      assistantMessageId = data.messageId
                      setStreamingMessageId(assistantMessageId)
                      // Add new message ID
                      setNewMessageIds(prev => new Set([...prev, assistantMessageId]))
                      // Initialize AI response message
                      setMessages(prev => [...prev, {
                        id: assistantMessageId,
                        role: "assistant" as const,
                        content: '',
                        timestamp: new Date(),
                      }])
                      // Scroll immediately when new AI response message is generated
                      adjustDynamicPadding()
                      scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom
                    }

                    if (data.content) {
                      assistantContent += data.content
                      // Real-time update of AI response
                      setMessages(prev => 
                        prev.map(m => 
                          m.id === assistantMessageId 
                            ? { ...m, content: assistantContent }
                            : m
                        )
                      )
                      // Maintain scroll position and adjust padding during streaming (frequency adjusted)
                      if (assistantContent.length % 100 === 0) {
                        adjustDynamicPadding()
                        scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom
                      }
                    }

                    if (data.titleGenerated) {
                      // Title has been generated, immediately refresh sidebar
                      const eventDetail = { chatId: data.chatId, title: data.title }
                      window.dispatchEvent(new CustomEvent('chatTitleUpdated', { 
                        detail: eventDetail
                      }))
                    }

                    if (data.done) {
                      break
                    }
                  } catch (e) {
                    // Ignore JSON parsing errors
                  }
                }
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              // Stream processing aborted
            } else {
              console.error('Stream processing error:', error)
            }
          }
        }

        await processStream()
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // AI message sending aborted
      } else {
        console.error('AI message sending error:', error)
      }
    } finally {
      streamingInProgress.current = false
      setIsStreaming(false)
      setRegeneratingMessageId(null)
      setStreamingMessageId(null)
      abortControllerRef.current = null
      
      // Final padding adjustment and forced scroll when streaming completes
      adjustDynamicPadding()
      scrollToBottomSmooth(true) // Force scroll
      
      // Scroll one more time after streaming completes (after DOM updates)
      setTimeout(() => {
        scrollToBottomSmooth()
      }, 100)
      
      // Additional scroll handling - wait for DOM to fully render after streaming
      setTimeout(() => {
        scrollToBottomSmooth()
      }, 100)
      
      // Final scroll adjustment
      setTimeout(() => {
        scrollToBottomSmooth()
      }, 500)
      
      // Restore base padding after streaming completes
      setTimeout(() => {
        setDynamicPadding(isMobile ? 320 : 160)
      }, 2000)
      
      // Clear duplicate prevention after request completes
      setTimeout(() => {
        sessionStorage.removeItem(`lastMessage_${chatId}`)
      }, 3000) // Clear after 3 seconds
    }
  }

  // Load chat history when chatId or session changes
  useEffect(() => {
    let isCancelled = false
    
    console.log('=== ChatPage useEffect triggered ===')
    console.log('chatId:', chatId)
    console.log('session?.user?.id:', session?.user?.id)
    console.log('sessionStatus:', sessionStatus)
    
    // Initialize loading state
    setHistoryLoaded(false)
    setShowSkeleton(true)
    
    // Ensure minimum skeleton UI display time (300ms)
    const minSkeletonDisplayTime = 300
    const skeletonStartTime = Date.now()
    
    if (chatId && session?.user?.id) {
      // Get chat history from API
      const loadChatHistory = async () => {
        if (isCancelled) return

        try {
          console.log('=== Fetching chat history ===')
          console.log('URL:', `/api/chat/${chatId}?userId=${session.user.id}`)
          const response = await fetch(`/api/chat/${chatId}?userId=${session.user.id}`)
          console.log('Response status:', response.status)
          if (isCancelled) return
          
          if (response.ok) {
            const data = await response.json()
            console.log('Chat history data:', data)
            if (isCancelled) return
            
            // Convert timestamp to Date object
            const messagesWithDateTimestamp = (data.messages || []).map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
            console.log('Processed messages:', messagesWithDateTimestamp)
            
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
                console.log('Messages set, length:', messagesWithDateTimestamp.length)
                
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
                      
                      // Call streaming API
                      sendMessageToAI(lastMessage.content, parsedAgentInfo)
                      
                      // Clean up localStorage after use (delay to prevent race condition)
                      setTimeout(() => {
                        localStorage.removeItem(`chat_${chatId}_agent`)
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
            console.error('Response status:', response.status)
            const errorText = await response.text()
            console.error('Error response:', errorText)
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
                  console.log('=== History loading completed ===')
                  console.log('historyLoaded: true, showSkeleton: false')
                  
                  // Move to bottom immediately after content is loaded (without animation)
                  // 여러 단계로 스크롤 처리하여 확실하게 맨 밑으로 이동
                  setTimeout(() => {
                    scrollToBottomInstant()
                  }, 100)
                  
                  // 추가 스크롤 처리 - DOM 완전 렌더링 후
                  setTimeout(() => {
                    scrollToBottomInstant()
                  }, 300)
                  
                  // 최종 스크롤 처리
                  setTimeout(() => {
                    scrollToBottomInstant()
                  }, 600)
                })
              }
            }, remainingTime)
          }
        }
      }

      loadChatHistory()
    } else {
      // chatId나 session이 없으면 최소 시간 후 로딩 완료 처리
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
  }, [chatId, session?.user?.id, isMobile])

  // Handle session status changes
  useEffect(() => {
    // Reset history load state when session changes
    if (!session?.user?.id) {
      setHistoryLoaded(false)
      setShowSkeleton(false)
      setMessages([])
    }
  }, [session?.user?.id])

  // Handle scroll on message change (also works when chat ID changes)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        // Move to bottom immediately on first load (without animation)
        setTimeout(() => scrollToBottomInstant(), 100)
        setTimeout(() => scrollToBottomInstant(), 300)
        setTimeout(() => scrollToBottomInstant(), 600)
        setIsInitialLoad(false)
      } else {
        // Smooth scroll when new message is added
        setTimeout(() => scrollToBottomSmooth(true), 100)
        setTimeout(() => scrollToBottomInstant(), 300)
        setTimeout(() => scrollToBottomInstant(), 600)
      }
      
      // Adjust padding when messages change
      setTimeout(() => adjustDynamicPadding(), 200)
      
      // Clean up new message IDs after animation completes
      setTimeout(() => {
        setNewMessageIds(new Set())
      }, 1000)
    }
  }, [messages, isInitialLoad, adjustDynamicPadding])
  
  // Reset to initial load state when chatId changes
  useEffect(() => {
    setIsInitialLoad(true)
    const basePadding = isMobile !== undefined ? (isMobile ? 320 : 160) : 240
    setDynamicPadding(basePadding) // Reset padding too
  }, [chatId, isMobile])

  // Add scroll event listener - prevent auto scroll when user scrolls
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      // 스크롤 이벤트 디바운싱으로 성능 최적화
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      scrollTimeout = setTimeout(() => {
        // Disable auto scroll flag when user scrolls manually
        if (!isScrollingToBottom.current) {
          const { scrollTop, scrollHeight, clientHeight } = container
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 80
          
          // 긴 메시지에서 스크롤 중 렌더링 안정성 확보
          if (!isAtBottom) {
            // 스크롤이 상단으로 이동할 때 렌더링 강제 업데이트 방지
            container.style.contentVisibility = 'auto'
          }
        }
      }, 16) // 60fps에 맞춰 디바운싱
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [])

  // ResizeObserver를 사용하여 콘텐츠 크기 변경 감지 및 자동 스크롤
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 콘텐츠 크기가 변경되었을 때 사용자가 하단 근처에 있으면 자동 스크롤
        const { scrollTop, scrollHeight, clientHeight } = container
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
        
        if (isNearBottom && !isScrollingToBottom.current) {
          // 짧은 지연 후 스크롤 (DOM 업데이트 대기)
          setTimeout(() => {
            scrollToBottomInstant()
          }, 50)
        }
      }
    })

    // 메시지 컨테이너 관찰
    resizeObserver.observe(container)
    
    // 내부 콘텐츠 컨테이너도 관찰
    const innerContainer = container.querySelector('.max-w-full')
    if (innerContainer) {
      resizeObserver.observe(innerContainer)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

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

  // Move to bottom immediately without animation
  const scrollToBottomInstant = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      isScrollingToBottom.current = true
      
      // 여러 번 시도하여 확실하게 맨 밑으로 스크롤
      const scrollToMax = () => {
        // 스크롤 높이를 다시 계산하여 최신 값 사용
        const maxScrollTop = container.scrollHeight - container.clientHeight
        container.scrollTop = Math.max(0, maxScrollTop)
        lastScrollHeight.current = container.scrollHeight
      }
      
      // 즉시 스크롤
      scrollToMax()
      
      // DOM 업데이트를 위한 다중 시도
      requestAnimationFrame(() => {
        scrollToMax()
        
        requestAnimationFrame(() => {
          scrollToMax()
          
          // 100ms 후 한 번 더
          setTimeout(() => {
            scrollToMax()
            
            // 300ms 후 최종 확인
            setTimeout(() => {
              scrollToMax()
              isScrollingToBottom.current = false
            }, 300)
          }, 100)
        })
      })
    }
  }

  // Move to bottom smoothly with animation
  const scrollToBottomSmooth = (force: boolean = false) => {
    if (messagesContainerRef.current && !isScrollingToBottom.current) {
      const container = messagesContainerRef.current
      const newScrollHeight = container.scrollHeight
      
      // Don't scroll if scroll height hasn't changed (ignore if force is true)
      if (!force && newScrollHeight <= lastScrollHeight.current + 10) {
        return
      }
      
      isScrollingToBottom.current = true
      lastScrollHeight.current = newScrollHeight
      
      // 실제 최대 스크롤 위치 계산
      const maxScrollTop = Math.max(0, newScrollHeight - container.clientHeight)
      
      // 부드럽게 스크롤
      container.scrollTo({
        top: maxScrollTop,
        behavior: 'smooth'
      })
      
      // 스크롤 완료 후 여러 번 확인
      setTimeout(() => {
        const currentMaxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        if (container.scrollTop < currentMaxScrollTop - 20) {
          container.scrollTop = currentMaxScrollTop
        }
        
        // 한 번 더 확인
        setTimeout(() => {
          const finalMaxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
          if (container.scrollTop < finalMaxScrollTop - 20) {
            container.scrollTop = finalMaxScrollTop
          }
          isScrollingToBottom.current = false
        }, 300)
      }, 600) // 애니메이션 완료 대기
    }
  }

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
    // 2초 후 복사 상태 초기화
    setTimeout(() => {
      setCopiedMessageId(null)
    }, 2000)
  }, [])

  const handleLikeMessage = useCallback((messageId: string) => {
    setLikedMessages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
        // 좋아요 취소 후 처리
        setDislikedMessages((prevDisliked) => {
          const newDislikedSet = new Set(prevDisliked)
          newDislikedSet.delete(messageId)
          return newDislikedSet
        })
      }
      return newSet
    })
  }, [])

  const handleDislikeMessage = useCallback((messageId: string) => {
    setDislikedMessages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
        // 좋아요 취소 후 처리
        setLikedMessages((prevLiked) => {
          const newLikedSet = new Set(prevLiked)
          newLikedSet.delete(messageId)
          return newLikedSet
        })
      }
      return newSet
    })
  }, [])

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
    setSelectedMessageId(null)
  }, [])

  const handleSaveEdit = (messageId: string) => {
    // 메시지 내용 업데이트
    const updatedMessages = messages.map((msg) => 
      msg.id === messageId ? { ...msg, content: editingContent } : msg
    )
    setMessages(updatedMessages)
    
    // 편집 상태 초기화
    setEditingMessageId(null)
    const savedContent = editingContent
    setEditingContent("")

    // 편집된 사용자 메시지인 경우 해당 메시지 이후 모든 메시지 삭제하고 재생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    const editedMessage = messages[messageIndex]
    
    if (editedMessage && editedMessage.role === "user" && selectedModel && chatId && session?.user?.id) {
      // 스트리밍 중이면 먼저 중단
      if (isStreaming) {
        handleAbort()
      }
      
      // 해당 사용자 메시지에 대해 재생성 상태 설정
      setRegeneratingMessageId(messageId)
      
      // 해당 사용자 메시지 이후의 모든 메시지 제거 (편집된 사용자 메시지는 유지)
      setTimeout(() => {
        setMessages(prev => prev.slice(0, messageIndex + 1))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 편집된 내용으로 AI 재생성
        setTimeout(() => {
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          sendMessageToAI(savedContent, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300)
      }, 100) // 메시지 업데이트 후 잠시 대기
    }
  }

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingContent("")
  }, [])

  const handleRegenerateResponse = (messageId: string) => {
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      handleAbort()
    }
    
    // 해당 AI 응답 메시지와 그 이후의 모든 메시지를 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex > 0 && selectedModel && chatId && session?.user?.id) {
      const previousUserMessage = messages[messageIndex - 1]
      if (previousUserMessage.role === "user") {
        // 해당 사용자 메시지에 대해 재생성 상태 설정
        setRegeneratingMessageId(previousUserMessage.id)
        
        // 해당 AI 응답 메시지부터 모든 메시지 제거 (사용자 메시지는 유지)
        setMessages(messages.slice(0, messageIndex))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 재생성을 위한 상태 초기화 및 AI 요청
        setTimeout(() => {
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          sendMessageToAI(previousUserMessage.content, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300) // 중단 처리 완료를 위해 짧은 지연
      }
    }
  }

  const handleRegenerateFromUserMessage = async (messageId: string) => {
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      handleAbort()
    }
    
    // 해당 사용자 메시지부터 하위 모든 메시지 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex >= 0 && selectedModel && chatId && session?.user?.id) {
      const userMessage = messages[messageIndex]
      if (userMessage.role === "user") {
        // 해당 사용자 메시지에 대해 재생성 상태 설정
        setRegeneratingMessageId(messageId)
        
        // 사용자 메시지 다음부터의 모든 메시지가 있는지 확인
        const nextMessageIndex = messageIndex + 1
        if (nextMessageIndex < messages.length) {
          const nextMessage = messages[nextMessageIndex]
          
          try {
            // 데이터베이스에서 해당 메시지부터 이후 모든 메시지 삭제
            const response = await fetch(`/api/chat/${chatId}?userId=${session.user.id}&fromMessageId=${nextMessage.id}`, {
              method: 'DELETE'
            })
            
            if (!response.ok) {
              throw new Error('Failed to delete messages from database')
            }
          } catch (error) {
            console.error('Error deleting messages from database:', error)
            // 데이터베이스 삭제 실패해도 UI에서는 진행
          }
        }
        
        // 해당 사용자 메시지 이후의 모든 메시지 제거 (사용자 메시지는 유지)
        setMessages(messages.slice(0, messageIndex + 1))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 재생성을 위한 상태 초기화 및 AI 요청
        setTimeout(() => {
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          sendMessageToAI(userMessage.content, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300) // 중단 처리 완료를 위해 짧은 지연
      }
    }
  }

  const handleSubmit = useCallback(async () => {
    // 이미 전송 중인 경우 차단
    if (isSubmitting) {
      console.log('Already submitting, preventing duplicate')
      return
    }
    
    // 중복 메시지 검사 (같은 메시지가 1초 이내에 전송되는 경우)
    const currentTime = Date.now()
    const messageToCheck = inputValue.trim() || 'IMAGE_ONLY'
    
    if (lastSubmittedMessage.current === messageToCheck && 
        currentTime - lastSubmittedTime.current < 1000) {
      console.log('Duplicate message detected, preventing submission')
      return
    }
    
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      handleAbort()
    }
    
    if ((inputValue.trim() || uploadedImages.length > 0) && selectedModel && chatId && session?.user?.id) {
      // 전송 중 플래그 설정
      setIsSubmitting(true)
      
      // 중복 방지 정보 업데이트
      lastSubmittedMessage.current = messageToCheck
      lastSubmittedTime.current = currentTime
      
      // 전송할 이미지와 메시지 콘텐츠 준비
      const imagesToSend = [...uploadedImages]
      const messageContent = inputValue
      
      // 사용자 메시지 콘텐츠 생성 (이미지 정보 포함)
      let userMessageContent = inputValue || ''
      
      // 이미지가 있는 경우 JSON 형태로 저장 (UserRequest에서 파싱하여 표시)
      if (imagesToSend.length > 0) {
        const imageInfos = await Promise.all(
          imagesToSend.map(async (image) => {
            // 사용자 메시지 표시를 위해 base64 데이터도 포함
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

      // 메시지 추가 (이미지 정보 포함)
      const newUserMessage: Message = {
        id: generateUniqueId("user"),
        role: "user",
        content: userMessageContent,
        timestamp: new Date(),
      }

      // 새 메시지 ID 추가
      setNewMessageIds(prev => new Set([...prev, newUserMessage.id]))
      setMessages([...messages, newUserMessage])
      
      // 입력 상태 초기화
      setInputValue("")
      setUploadedImages([]) // 이미지 상태 초기화
      
      // ChatInput의 이미지도 초기화
      setClearImagesTrigger(prev => !prev)
      
      // 텍스트 입력창 강제 초기화 (한글 IME 조합 중인 글자 제거)
      // IME 조합 완료를 위해 약간의 지연 후 초기화
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.value = ""
          textareaRef.current.style.height = "auto"
          textareaRef.current.style.height = "52px"
          
          // React 상태와 동기화
          setInputValue("")
        }
      }, 0)
      
      // 메시지 추가 후 즉시 스크롤
      scrollToBottomSmooth()

      // 스트리밍이 중단되었다면 잠시 대기 후 새 메시지 전송
      const sendMessage = () => {
        sendMessageToAI(messageContent, {
          id: selectedModel.id,
          type: selectedModel.type
        }, false, imagesToSend).finally(() => {
          // 전송 완료 후 플래그 해제
          setIsSubmitting(false)
        })
      }
      
      if (isStreaming) {
        // 스트리밍 중단 처리 완료를 위해 짧은 지연 후 전송
        setTimeout(sendMessage, 100)
      } else {
        // 즉시 전송
        sendMessage()
      }
    }
  }, [inputValue, uploadedImages, messages, selectedModel, chatId, session?.user?.id, isStreaming, isSubmitting, generateUniqueId, scrollToBottomSmooth, sendMessageToAI, handleAbort])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
    }

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: 줄바꿈 허용 (기본 동작)
        return
      } else {
        // Enter만 누르면 submit 동작
        e.preventDefault()
        
        // IME 조합 중인지 확인
        if (e.nativeEvent.isComposing || isComposing) {
          // 조합 중이면 잠시 대기
          return
        }
        
        // 한글 IME 조합 완료를 위한 짧은 지연
        setTimeout(() => {
          handleSubmit()
        }, 10)
      }
    }
  }, [handleSubmit, isComposing])

  // 메시지 렌더링을 조건부 렌더링 밖에서 정의하여 Hook 순서 유지
  const renderedMessages = useMemo(() => {
    console.log('=== Rendering messages ===')
    console.log('messages.length:', messages.length)
    console.log('historyLoaded:', historyLoaded)
    console.log('showSkeleton:', showSkeleton)
    
    return messages.map((message, index) => (
      <MessageWrapper
        key={message.id}
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
  }, [messages, newMessageIds, copiedMessageId, likedMessages, dislikedMessages, isStreaming, editingMessageId, editingContent, regeneratingMessageId, streamingMessageId, handleCopyMessage, handleLikeMessage, handleDislikeMessage, handleRegenerateResponse, handleEditMessage, handleSaveEdit, handleCancelEdit, handleRegenerateFromUserMessage]
  )

  // 세션 상태에 따른 처리
  if (sessionStatus === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (sessionStatus === "unauthenticated") {
    router.push('/auth')
    return null
  }

  if (!selectedModel) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div className="text-gray-600 dark:text-gray-400">
          {lang('error.no_model_selected')}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 메시지 컨테이너 */}
      <div className="flex-1 flex flex-col px-3 sm:px-0 relative overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="messages-container flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 transition-all duration-200 ease-out mobile-scroll touch-scroll"
          style={{ 
            scrollBehavior: 'smooth',
            paddingBottom: `${dynamicPadding}px`,
            overflowAnchor: 'none'
          }}
        >
          <div className="sm:px-3 max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
            {(() => {
              console.log('=== Render condition check ===')
              console.log('!historyLoaded && showSkeleton:', !historyLoaded && showSkeleton)
              console.log('!historyLoaded && !showSkeleton:', !historyLoaded && !showSkeleton)
              console.log('else (should render messages):', historyLoaded)
              console.log('renderedMessages length:', renderedMessages.length)
              
              if (!historyLoaded && showSkeleton) {
                console.log('Rendering skeleton')
                return <ChatMessageSkeleton />
              } else if (!historyLoaded && !showSkeleton) {
                console.log('Rendering empty div')
                return <div></div>
              } else {
                console.log('Rendering messages')
                return renderedMessages
              }
            })()}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* 입력 컨테이너 - 단 고정 */}
          <ChatInput
            inputValue={inputValue}
            textareaRef={textareaRef}
            isGlobeActive={isGlobeActive}
            isFlaskActive={isFlaskActive}
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
            setIsFlaskActive={setIsFlaskActive}
            onImageUpload={handleImageUpload}
            clearImages={clearImagesTrigger}
          />
      </div>
    </>
  )
}
