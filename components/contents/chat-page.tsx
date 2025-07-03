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

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatPageProps {
  chatId?: string
}

// 메모이제이션된 메시지 래퍼 컴포넌트
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
      className={`mb-6 ${isNewMessage ? 'message-enter' : ''} ${message.role === "user" ? "flex justify-end" : ""}`}
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
  // 메시지 내용이 변경되지 않았고, 해당 메시지와 관련된 상태만 변경되었을 때만 리렌더링
  const message = prevProps.message
  const nextMessage = nextProps.message
  
  // 메시지 자체가 변경되었으면 리렌더링
  if (message.id !== nextMessage.id || message.content !== nextMessage.content) {
    return false
  }
  
  // 현재 메시지가 스트리밍 중이면 리렌더링
  if (nextProps.streamingMessageId === message.id) {
    return false
  }
  
  // 현재 메시지가 편집 중이면 리렌더링
  if (nextProps.editingMessageId === message.id) {
    return false
  }
  
  // 현재 메시지가 재생성 중이면 리렌더링
  if (nextProps.regeneratingMessageId === message.id) {
    return false
  }
  
  // 현재 메시지가 복사되었으면 리렌더링
  if (nextProps.copiedMessageId === message.id) {
    return false
  }
  
  // 현재 메시지가 새 메시지이면 리렌더링
  if (nextProps.isNewMessage !== prevProps.isNewMessage) {
    return false
  }
  
  // 좋아요/싫어요 상태가 변경되었으면 리렌더링
  if (nextProps.likedMessages.has(message.id) !== prevProps.likedMessages.has(message.id) ||
      nextProps.dislikedMessages.has(message.id) !== prevProps.dislikedMessages.has(message.id)) {
    return false
  }
  
  // 그 외의 경우는 리렌더링하지 않음
  return true
})

// 채팅 메시지 스켈레톤 컴포넌트
const ChatMessageSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 첫 번째 AI 응답 스켈레톤 */}
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

      {/* 두 번째 AI 응답 스켈레톤 */}
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

      {/* 세 번째 AI 응답 스켈레톤 */}
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
  const { data: session } = useSession()
  const { lang } = useTranslation('chat')
  const { selectedModel } = useModel()
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
  const [dynamicPadding, setDynamicPadding] = useState(160) // 기본 패딩 160px
  
  // React Strict Mode 중복 실행 방지를 위한 ref
  const streamingInProgress = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isScrollingToBottom = useRef(false)
  const lastScrollHeight = useRef(0)

  // Unique ID generation function
  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // 메시지 컨테이너의 높이를 감지하여 동적 패딩 조정
  const adjustDynamicPadding = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const containerHeight = container.clientHeight
      const scrollHeight = container.scrollHeight
      const scrollTop = container.scrollTop
      
      // 스크롤이 거의 맨 아래에 있을 때만 패딩 조정
      const isNearBottom = scrollHeight - scrollTop - containerHeight < 80
      
      if (isNearBottom) {
        // 마지막 메시지의 코드 블록만 확인 (과도한 패딩 방지)
        const lastMessage = container.querySelector('.max-w-3xl > div:last-child')
        let additionalPadding = 0
        
        if (lastMessage) {
          const codeBlocks = lastMessage.querySelectorAll('.code-block')
          if (codeBlocks.length > 0) {
            // 마지막 메시지의 코드 블록 높이만 고려
            const lastCodeBlock = codeBlocks[codeBlocks.length - 1]
            const rect = lastCodeBlock.getBoundingClientRect()
            
            // 코드 블록 높이가 150px 이상일 때만 추가 패딩
            if (rect.height > 150) {
              additionalPadding = Math.min(rect.height * 0.3, 100) // 최대 100px 추가
            }
          }
        }
        
                 // 기본 패딩 + 제한된 추가 패딩
         const newPadding = Math.max(160, 160 + additionalPadding)
        
        // 임계값을 높여서 불필요한 패딩 변경 방지
        const threshold = 30
        
        if (Math.abs(newPadding - dynamicPadding) > threshold) {
          setDynamicPadding(newPadding)
        }
             } else {
         // 스크롤이 위에 있을 때는 기본 패딩으로 복원
         if (dynamicPadding > 160) {
           setDynamicPadding(160)
         }
       }
    }
  }, [dynamicPadding])

  // Handle abort streaming
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    streamingInProgress.current = false
    setIsStreaming(false)
    setRegeneratingMessageId(null)
    setStreamingMessageId(null)
    
    // 스트리밍 중단 시 패딩 조정 및 스크롤
    adjustDynamicPadding()
    scrollToBottomSmooth()
  }

  // Send message to AI and receive streaming response
  const sendMessageToAI = async (message: string, agentInfo: {id: string, type: string}, isRegeneration: boolean = false) => {
    if (!session?.user?.id) {
      console.error('User authentication required')
      return
    }

    // Abort if already streaming
    if (streamingInProgress.current) {
      return
    }

    // Simple duplicate prevention using message content
    const lastMessage = sessionStorage.getItem(`lastMessage_${chatId}`)
    if (lastMessage === message) {
      return
    }
    sessionStorage.setItem(`lastMessage_${chatId}`, message)

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    streamingInProgress.current = true
    setIsStreaming(true)
    
    // 스트리밍 시작 시 패딩 조정 및 스크롤
    adjustDynamicPadding()
    scrollToBottomSmooth()

    try {

      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          agentId: agentInfo.type === 'agent' ? agentInfo.id : undefined,
          modelId: agentInfo.type === 'model' ? agentInfo.id : undefined,
          modelType: agentInfo.type,
          userId: session.user.id,
          isRegeneration: isRegeneration,
        }),
        signal: abortController.signal
      })

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
                      // 새 메시지 ID 추가
                      setNewMessageIds(prev => new Set([...prev, assistantMessageId]))
                      // Initialize AI response message
                      setMessages(prev => [...prev, {
                        id: assistantMessageId,
                        role: "assistant" as const,
                        content: '',
                        timestamp: new Date(),
                      }])
                      // 새 AI 응답 메시지 생성 시 즉시 스크롤
                      adjustDynamicPadding()
                      scrollToBottomSmooth()
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
                      // 스트리밍 중 스크롤 유지 및 패딩 조정 (빈도 조정)
                      if (assistantContent.length % 100 === 0) {
                        adjustDynamicPadding()
                        scrollToBottomSmooth()
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
      
      // 스트리밍 완료 시 최종 패딩 조정 및 스크롤
      adjustDynamicPadding()
      scrollToBottomSmooth()
      
      // 스트리밍 완료 후 잠시 후 기본 패딩으로 복원
      setTimeout(() => {
        setDynamicPadding(160)
      }, 2000)
      
      // Clear duplicate prevention after request completes
      setTimeout(() => {
        sessionStorage.removeItem(`lastMessage_${chatId}`)
      }, 5000) // Clear after 5 seconds
    }
  }

  // Load messages based on chat ID
  useEffect(() => {
    // 새로운 채팅 로드 시 상태 초기화
    setHistoryLoaded(false)
    setShowSkeleton(false)
    
    let isCancelled = false
    let skeletonTimer: NodeJS.Timeout | null = null
    
    // 스켈레톤 UI 지연 표시 (200ms 후에 표시)
    skeletonTimer = setTimeout(() => {
      if (!isCancelled) {
        // requestAnimationFrame을 사용해 렌더링 블로킹 방지
        requestAnimationFrame(() => {
          setShowSkeleton(true)
        })
      }
    }, 200)
    
    if (chatId && session?.user?.id) {
      // Get chat history from API
      const loadChatHistory = async () => {
        if (isCancelled) return

        try {
          const response = await fetch(`/api/chat/${chatId}?userId=${session.user.id}`)
          if (isCancelled) return
          
          if (response.ok) {
            const data = await response.json()
            if (isCancelled) return
            
            // Convert timestamp to Date object
            const messagesWithDateTimestamp = (data.messages || []).map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
            // 메시지가 많을 때 배치 처리로 렌더링 성능 개선
            if (messagesWithDateTimestamp.length > 50) {
              // 많은 메시지가 있을 때는 배치로 처리
              setMessages([])
              requestAnimationFrame(() => {
                setMessages(messagesWithDateTimestamp)
              })
            } else {
              setMessages(messagesWithDateTimestamp)
            }
            
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
          } else {
            console.error('Failed to load chat history')
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('Chat history load error:', error)
          }
        } finally {
          if (!isCancelled) {
            // 메시지가 많을 때 렌더링 블로킹 방지
            requestAnimationFrame(() => {
              setHistoryLoaded(true) // Mark history load as completed
              setShowSkeleton(false) // 스켈레톤 UI 숨김
            })
          }
        }
      }

      loadChatHistory()
      
      // Move to bottom immediately after loading messages (without animation)
      setTimeout(() => {
        if (!isCancelled) {
          scrollToBottomInstant()
        }
      }, 0)
    } else {
      // chatId나 session이 없으면 즉시 로딩 완료 처리
      setTimeout(() => {
        if (!isCancelled) {
          requestAnimationFrame(() => {
            setHistoryLoaded(true)
            setShowSkeleton(false)
          })
        }
      }, 100) // 스켈레톤이 잠깐 보이도록 100ms 지연
    }

    // Cleanup function
    return () => {
      isCancelled = true
      if (skeletonTimer) {
        clearTimeout(skeletonTimer)
      }
    }
  }, [chatId, session?.user?.id])

  // Handle session status changes
  useEffect(() => {
    // Reset history load state when session changes
    if (!session?.user?.id) {
      setHistoryLoaded(false)
      setShowSkeleton(false)
      setMessages([])
    }
  }, [session?.user?.id])

    // Reset history load state when chat ID changes - 이제 메인 useEffect에서 처리됨
  // useEffect(() => {
  //   setHistoryLoaded(false)
  //   setShowSkeleton(false)
  // }, [chatId])

  // Handle scroll on message change (also works when chat ID changes)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        // Move to bottom immediately on first load
        setTimeout(() => scrollToBottomInstant(), 50)
        setIsInitialLoad(false)
      } else {
        // Smooth scroll when new message is added
        setTimeout(() => scrollToBottomSmooth(), 50)
      }
      
      // 메시지 변경 시 패딩 조정
      setTimeout(() => adjustDynamicPadding(), 100)
      
      // 애니메이션 완료 후 새 메시지 ID 정리
      setTimeout(() => {
        setNewMessageIds(new Set())
      }, 500)
    }
  }, [messages, isInitialLoad, adjustDynamicPadding])
  
  // Reset to initial load state when chatId changes
  useEffect(() => {
    setIsInitialLoad(true)
    setDynamicPadding(160) // 패딩도 초기화
  }, [chatId])

  // 컴포넌트 마운트시에도 즉시 맨 아래로 이동
  useEffect(() => {
    setTimeout(() => scrollToBottomInstant(), 0)
  }, [])

  // 스크롤 이벤트 리스너 추가 - 사용자가 스크롤하면 자동 스크롤 방지
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // 사용자가 직접 스크롤하는 경우 자동 스크롤 플래그 해제
      if (!isScrollingToBottom.current) {
        const { scrollTop, scrollHeight, clientHeight } = container
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 80
        
        // 맨 아래가 아닌 곳으로 스크롤했다면 자동 스크롤 비활성화
        if (!isAtBottom) {
          // 사용자가 위로 스크롤했으므로 자동 스크롤 일시 중단
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 컴포넌트 언마운트 시 스트리밍 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      streamingInProgress.current = false
      setIsStreaming(false)
    }
  }, [])

  // 애니메이션 없이 즉시 맨 아래로 이동
  const scrollToBottomInstant = () => {
    if (messagesContainerRef.current && !isScrollingToBottom.current) {
      const container = messagesContainerRef.current
      isScrollingToBottom.current = true
      container.scrollTop = container.scrollHeight
      lastScrollHeight.current = container.scrollHeight
      
      setTimeout(() => {
        isScrollingToBottom.current = false
      }, 100)
    }
  }

  // 부드러운 스크롤로 맨 아래로 이동
  const scrollToBottomSmooth = () => {
    if (messagesContainerRef.current && !isScrollingToBottom.current) {
      const container = messagesContainerRef.current
      const newScrollHeight = container.scrollHeight
      
      // 스크롤 높이가 변하지 않았다면 스크롤하지 않음
      if (newScrollHeight <= lastScrollHeight.current + 10) {
        return
      }
      
      isScrollingToBottom.current = true
      lastScrollHeight.current = newScrollHeight
      
      // 스크롤 높이에 동적 패딩을 고려하여 확실히 맨 아래로 이동
      container.scrollTo({
        top: newScrollHeight + dynamicPadding + 100,
        behavior: 'smooth'
      })
      
      setTimeout(() => {
        isScrollingToBottom.current = false
      }, 300)
    }
  }

  const adjustHeight = () => {
    // 높이는 고정으로 사용
  }

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // 높이 조정 제거
  }, [])

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
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
          
          sendMessageToAI(userMessage.content, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300) // 중단 처리 완료를 위해 짧은 지연
      }
    }
  }

  const handleSubmit = useCallback(() => {
    // 스트리밍 중이면 제출 금지
    if (isStreaming) {
      return
    }
    
    if (inputValue.trim() && selectedModel && chatId && session?.user?.id) {
      // 메시지 추가
      const newUserMessage: Message = {
        id: generateUniqueId("user"),
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      }

      // 새 메시지 ID 추가
      setNewMessageIds(prev => new Set([...prev, newUserMessage.id]))
      setMessages([...messages, newUserMessage])
      const messageContent = inputValue
      setInputValue("")
      
      // 메시지 추가 후 즉시 스크롤
      scrollToBottomSmooth()

      // 스크롤 초기화
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px"
      }

      // AI에게 메시지 전송
      sendMessageToAI(messageContent, {
        id: selectedModel.id,
        type: selectedModel.type
      })
    }
  }, [inputValue, messages, selectedModel, chatId, session?.user?.id, isStreaming, generateUniqueId, scrollToBottomSmooth, sendMessageToAI])

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
        handleSubmit()
      }
    }
  }, [handleSubmit])

  // 메시지 렌더링을 조건부 렌더링 밖에서 정의하여 Hook 순서 유지
  const renderedMessages = useMemo(() => 
    messages.map((message) => (
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
    )), 
    [messages, newMessageIds, copiedMessageId, likedMessages, dislikedMessages, isStreaming, editingMessageId, editingContent, regeneratingMessageId, streamingMessageId, handleCopyMessage, handleLikeMessage, handleDislikeMessage, handleRegenerateResponse, handleEditMessage, handleSaveEdit, handleCancelEdit, handleRegenerateFromUserMessage]
  )

  return (
    <>
      {/* 메시지 컨테이너 */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="messages-container flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 transition-all duration-200 ease-out mobile-scroll touch-scroll"
          style={{ 
            scrollBehavior: 'smooth',
            paddingBottom: `${dynamicPadding}px`,
            overflowAnchor: 'none'
          }}
        >
          <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
            {!historyLoaded && showSkeleton ? (
              <ChatMessageSkeleton />
            ) : !historyLoaded && !showSkeleton ? (
              <div></div>
            ) : (
              renderedMessages
            )}
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
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            handleKeyUp={handleKeyUp}
            handleSubmit={handleSubmit}
            handleAbort={handleAbort}
            setIsGlobeActive={setIsGlobeActive}
            setIsFlaskActive={setIsFlaskActive}
          />
      </div>
    </>
  )
}
