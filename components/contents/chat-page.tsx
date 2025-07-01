"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { LlmResponse } from "@/components/chat/llm-response"
import { UserRequest } from "@/components/chat/user-request"
import { ChatInput } from "@/components/chat/chat-input"
import { useTranslation } from "@/lib/i18n"
import { useModel } from "@/components/providers/model-provider"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatPageProps {
  chatId?: string
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
  const [isStreaming, setIsStreaming] = useState(false)
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  
  // React Strict Mode 중복 실행 방지를 위한 ref
  const streamingInProgress = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Unique ID generation function
  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Handle abort streaming
  const handleAbort = () => {
    if (abortControllerRef.current) {
      console.log('Aborting current streaming request...')
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    streamingInProgress.current = false
    setIsStreaming(false)
    setRegeneratingMessageId(null)
  }

  // Send message to AI and receive streaming response
  const sendMessageToAI = async (message: string, agentInfo: {id: string, type: string}) => {
    if (!session?.user?.id) {
      console.error('User authentication required')
      return
    }

    // Abort if already streaming
    if (streamingInProgress.current) {
      console.log('Streaming already in progress, skipping duplicate call')
      return
    }

    // Simple duplicate prevention using message content
    const lastMessage = sessionStorage.getItem(`lastMessage_${chatId}`)
    if (lastMessage === message) {
      console.log('Duplicate message detected, skipping:', message.substring(0, 30))
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

    // Track message count for debugging (server will determine if title generation is needed)
    console.log('Current messages count when starting AI call:', messages.length)

    try {
      console.log('=== AI message sending start ===')
      console.log('Timestamp:', new Date().toISOString())
      console.log('Message:', message)
      console.log('Agent info:', agentInfo)
      console.log('User ID:', session.user.id)
      console.log('Chat ID:', chatId)

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
        }),
        signal: abortController.signal
      })

      console.log('=== AI API response received ===')
      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API response error:', errorText)
        throw new Error(`Message sending failed (${response.status}: ${errorText})`)
      }

      // Process streaming response
      console.log('=== Stream processing start ===')
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        console.log('Stream reader created')
        let assistantContent = ''
        let assistantMessageId = ''

        const processStream = async () => {
          try {
            console.log('Stream processing loop start')
            while (true) {
              if (abortController.signal.aborted) {
                console.log('Stream aborted')
                break
              }

              const { done, value } = await reader.read()
              if (done) {
                console.log('Stream completed')
                break
              }

              const chunk = decoder.decode(value)
              console.log('Chunk received:', chunk)
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    console.log('Stream data:', data)
                    
                    if (data.error) {
                      console.error('AI response error:', data.error)
                      break
                    }

                    if (data.messageId && !assistantMessageId) {
                      assistantMessageId = data.messageId
                      // Initialize AI response message
                      setMessages(prev => [...prev, {
                        id: assistantMessageId,
                        role: "assistant" as const,
                        content: '',
                        timestamp: new Date(),
                      }])
                    }

                    if (data.content) {
                      assistantContent += data.content
                      console.log('Content received, total length:', assistantContent.length)
                      // Real-time update of AI response
                      setMessages(prev => 
                        prev.map(m => 
                          m.id === assistantMessageId 
                            ? { ...m, content: assistantContent }
                            : m
                        )
                      )
                    }

                    if (data.titleGenerated) {
                      // Title has been generated, immediately refresh sidebar
                      console.log('=== Title generation completed ===')
                      console.log('Generated title:', data.title)
                      console.log('For chat ID:', data.chatId)
                      console.log('Current chat ID:', chatId)
                      console.log('Chat IDs match:', data.chatId === chatId)
                      console.log('Dispatching chatTitleUpdated event...')
                      
                      // Dispatch immediately without delay
                      const eventDetail = { chatId: data.chatId, title: data.title }
                      console.log('Event detail:', eventDetail)
                      
                      window.dispatchEvent(new CustomEvent('chatTitleUpdated', { 
                        detail: eventDetail
                      }))
                      console.log('Event dispatched successfully')
                    }

                    if (data.done) {
                      console.log('Stream marked as done, final assistant content length:', assistantContent.length)
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
              console.log('Stream processing aborted')
            } else {
              console.error('Stream processing error:', error)
            }
          }
        }

        await processStream()
        
        // Stream processing completed - server will handle title generation if needed
        console.log('Stream processing completed.')
        console.log('Waiting for potential title generation from server...')
        
        // Wait a bit and log if title generation occurred
        setTimeout(() => {
          console.log('Title generation check completed.')
        }, 3000)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('AI message sending aborted')
      } else {
        console.error('AI message sending error:', error)
      }
    } finally {
      streamingInProgress.current = false
      setIsStreaming(false)
      setRegeneratingMessageId(null)
      abortControllerRef.current = null
      // Clear duplicate prevention after request completes
      setTimeout(() => {
        sessionStorage.removeItem(`lastMessage_${chatId}`)
      }, 5000) // Clear after 5 seconds
    }
  }

  // Load messages based on chat ID
  useEffect(() => {
    if (chatId && session?.user?.id) {
      let isCancelled = false
      
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
                console.log('First user message detected. Generating AI response.')
                
                if (!isCancelled) {
                  const parsedAgentInfo = JSON.parse(agentInfo)
                  console.log('Agent info:', parsedAgentInfo)
                  
                  // Call streaming API
                  console.log('Calling sendMessageToAI from loadChatHistory (auto-generation)')
                  sendMessageToAI(lastMessage.content, parsedAgentInfo)
                  
                  // Clean up localStorage after use (delay to prevent race condition)
                  setTimeout(() => {
                    localStorage.removeItem(`chat_${chatId}_agent`)
                  }, 1000)
                }
              } else {
                console.log('Not first conversation or no agent info, skipping auto-generation')
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
            setHistoryLoaded(true) // Mark history load as completed
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

      // Cleanup function
      return () => {
        isCancelled = true
      }
    }
  }, [chatId, session?.user?.id])

  // Handle session status changes
  useEffect(() => {
    // Reset history load state when session changes
    if (!session?.user?.id) {
      setHistoryLoaded(false)
      setMessages([])
    }
  }, [session?.user?.id])

    // Reset history load state when chat ID changes
  useEffect(() => {
    setHistoryLoaded(false)
  }, [chatId])

  // Handle scroll on message change (also works when chat ID changes)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        // Move to bottom immediately on first load
        setTimeout(() => scrollToBottomInstant(), 0)
        setIsInitialLoad(false)
      } else {
        // Smooth scroll when new message is added
        setTimeout(() => scrollToBottomSmooth(), 100)
      }
    }
  }, [messages, isInitialLoad])
  
  // Reset to initial load state when chatId changes
  useEffect(() => {
    setIsInitialLoad(true)
  }, [chatId])

  // 컴포넌트 마운트시에도 즉시 맨 아래로 이동
  useEffect(() => {
    setTimeout(() => scrollToBottomInstant(), 0)
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
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }

  // 부드러운 스크롤로 맨 아래로 이동
  const scrollToBottomSmooth = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  const adjustHeight = () => {
    // 높이는 고정으로 사용
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // 높이 조정 제거
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
  }

  const handleCopyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    // 2초 후 복사 상태 초기화
    setTimeout(() => {
      setCopiedMessageId(null)
    }, 2000)
  }

  const handleLikeMessage = (messageId: string) => {
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
  }

  const handleDislikeMessage = (messageId: string) => {
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
  }

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
    setSelectedMessageId(null)
  }

  const handleSaveEdit = (messageId: string) => {
    console.log('=== handleSaveEdit called ===')
    console.log('Message ID:', messageId)
    console.log('New content:', editingContent)
    
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
      console.log('User message edited, triggering regeneration with new content')
      
      // 스트리밍 중이면 먼저 중단
      if (isStreaming) {
        console.log('Streaming in progress, aborting current stream first')
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
          console.log('Calling sendMessageToAI for edited message regeneration')
          
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          
          sendMessageToAI(savedContent, {
            id: selectedModel.id,
            type: selectedModel.type
          })
        }, 300)
      }, 100) // 메시지 업데이트 후 잠시 대기
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  const handleRegenerateResponse = (messageId: string) => {
    console.log('=== handleRegenerateResponse called ===')
    console.log('Message ID to regenerate:', messageId)
    
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      console.log('Streaming in progress, aborting current stream first')
      handleAbort()
    }
    
    // 해당 메시지 이후의 모든 메시지 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex > 0 && selectedModel && chatId && session?.user?.id) {
      const previousUserMessage = messages[messageIndex - 1]
      if (previousUserMessage.role === "user") {
        console.log('Found previous user message:', previousUserMessage.content)
        
        // 해당 사용자 메시지에 대해 재생성 상태 설정
        setRegeneratingMessageId(previousUserMessage.id)
        
        // 해당 답변 이후의 모든 메시지 제거
        setMessages(messages.slice(0, messageIndex))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 재생성을 위한 상태 초기화 및 AI 요청
        setTimeout(() => {
          console.log('Calling sendMessageToAI for regeneration')
          
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          
          sendMessageToAI(previousUserMessage.content, {
            id: selectedModel.id,
            type: selectedModel.type
          })
        }, 300) // 중단 처리 완료를 위해 짧은 지연
      }
    } else {
      console.log('Cannot regenerate: missing requirements')
      console.log('messageIndex:', messageIndex)
      console.log('selectedModel:', selectedModel)
      console.log('chatId:', chatId)
      console.log('session user id:', session?.user?.id)
    }
  }

  const handleRegenerateFromUserMessage = (messageId: string) => {
    console.log('=== handleRegenerateFromUserMessage called ===')
    console.log('User message ID to regenerate from:', messageId)
    
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      console.log('Streaming in progress, aborting current stream first')
      handleAbort()
    }
    
    // 해당 사용자 메시지부터 하위 모든 메시지 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex >= 0 && selectedModel && chatId && session?.user?.id) {
      const userMessage = messages[messageIndex]
      if (userMessage.role === "user") {
        console.log('Found user message to regenerate from:', userMessage.content)
        
        // 해당 사용자 메시지에 대해 재생성 상태 설정
        setRegeneratingMessageId(messageId)
        
        // 해당 사용자 메시지 이후의 모든 메시지 제거 (사용자 메시지는 유지)
        setMessages(messages.slice(0, messageIndex + 1))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 재생성을 위한 상태 초기화 및 AI 요청
        setTimeout(() => {
          console.log('Calling sendMessageToAI for user message regeneration')
          
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          
          sendMessageToAI(userMessage.content, {
            id: selectedModel.id,
            type: selectedModel.type
          })
        }, 300) // 중단 처리 완료를 위해 짧은 지연
      }
    } else {
      console.log('Cannot regenerate from user message: missing requirements')
      console.log('messageIndex:', messageIndex)
      console.log('selectedModel:', selectedModel)
      console.log('chatId:', chatId)
      console.log('session user id:', session?.user?.id)
    }
  }

  const handleSubmit = () => {
    console.log('=== handleSubmit called ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Input value:', inputValue)
    console.log('Current messages count:', messages.length)
    console.log('Selected model:', selectedModel)
    console.log('Chat ID:', chatId)
    
    // 스트리밍 중이면 제출 금지
    if (isStreaming) {
      console.log('Streaming in progress, submit blocked')
      return
    }
    
    if (inputValue.trim() && selectedModel && chatId && session?.user?.id) {
      console.log('All conditions met, proceeding with message submission')
      
      // 메시지 추가
      const newUserMessage: Message = {
        id: generateUniqueId("user"),
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      }

      setMessages([...messages, newUserMessage])
      const messageContent = inputValue
      setInputValue("")
      
      // 메시지 추가 후 부드러운 스크롤
      setTimeout(() => scrollToBottomSmooth(), 100)

      // 스크롤 초기화
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px"
      }

      // AI에게 메시지 전송
      console.log('Calling sendMessageToAI from handleSubmit')
      sendMessageToAI(messageContent, {
        id: selectedModel.id,
        type: selectedModel.type
      })
    }
  }

  return (
    <>
      {/* 메시지 컨테이너 */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="messages-container flex-1 overflow-y-auto p-4 pb-[140px]"
          style={{ scrollBehavior: 'auto' }}
        >
          <div className="max-w-2xl mx-auto">
            {messages.map((message) => (
              <div key={message.id} className={`mb-6 ${message.role === "user" ? "flex justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <LlmResponse
                    id={message.id}
                    content={message.content}
                    timestamp={message.timestamp}
                    onCopy={handleCopyMessage}
                    onLike={handleLikeMessage}
                    onDislike={handleDislikeMessage}
                    onRegenerate={handleRegenerateResponse}
                    copiedMessageId={copiedMessageId}
                    likedMessages={likedMessages}
                    dislikedMessages={dislikedMessages}
                    isStreaming={isStreaming}
                  />
                )}

                {message.role === "user" && (
                  <UserRequest
                    id={message.id}
                    content={message.content}
                    timestamp={message.timestamp}
                    onCopy={handleCopyMessage}
                    onEdit={handleEditMessage}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    onRegenerate={handleRegenerateFromUserMessage}
                    editingMessageId={editingMessageId}
                    editingContent={editingContent}
                    setEditingContent={setEditingContent}
                    copiedMessageId={copiedMessageId}
                    isStreaming={isStreaming}
                    regeneratingMessageId={regeneratingMessageId}
                  />
                )}
              </div>
            ))}
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
