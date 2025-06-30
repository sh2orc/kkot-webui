"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Layout from "@/components/layout/layout"
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

  // Unique ID generation function
  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Send message to AI and receive streaming response
  const sendMessageToAI = async (message: string, agentInfo: {id: string, type: string}) => {
    if (!session?.user?.id) {
      console.error('User authentication required')
      return
    }

    try {
      console.log('=== AI message sending start ===')
      console.log('Message:', message)
      console.log('Agent info:', agentInfo)
      console.log('User ID:', session.user.id)

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
        })
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
                      // Real-time update of AI response
                      setMessages(prev => 
                        prev.map(m => 
                          m.id === assistantMessageId 
                            ? { ...m, content: assistantContent }
                            : m
                        )
                      )
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
            console.error('Stream processing error:', error)
          }
        }

        processStream()
      }
    } catch (error) {
      console.error('AI message sending error:', error)
    }
  }

  // Load messages based on chat ID
  useEffect(() => {
    if (chatId) {
      // Get chat history from API
      const loadChatHistory = async () => {
        if (!session?.user?.id) {
          console.error('사용자 인증이 필요합니다')
          return
        }

        try {
          const response = await fetch(`/api/chat/${chatId}?userId=${session.user.id}`)
          if (response.ok) {
            const data = await response.json()
            // Convert timestamp to Date object
            const messagesWithDateTimestamp = (data.messages || []).map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
            setMessages(messagesWithDateTimestamp)
            
            // Auto-generate AI response if last message is user message
            if (messagesWithDateTimestamp.length > 0) {
              const lastMessage = messagesWithDateTimestamp[messagesWithDateTimestamp.length - 1]
              if (lastMessage.role === 'user') {
                console.log('Last message is user message. Generating AI response.')
                
                // Read agent info from localStorage
                const agentInfo = localStorage.getItem(`chat_${chatId}_agent`)
                if (agentInfo) {
                  const parsedAgentInfo = JSON.parse(agentInfo)
                  console.log('Agent info:', parsedAgentInfo)
                  
                  // Call streaming API
                  sendMessageToAI(lastMessage.content, parsedAgentInfo)
                  
                  // Clean up localStorage after use
                  localStorage.removeItem(`chat_${chatId}_agent`)
                }
              }
            }
          } else {
            console.error('Failed to load chat history')
          }
        } catch (error) {
          console.error('Chat history load error:', error)
        } finally {
          setHistoryLoaded(true) // Mark history load as completed
        }
      }

      loadChatHistory()
      
      // Move to bottom immediately after loading messages (without animation)
      setTimeout(() => {
        scrollToBottomInstant()
      }, 0)
    }
  }, [chatId, session?.user?.id])

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
    setMessages(messages.map((msg) => (msg.id === messageId ? { ...msg, content: editingContent } : msg)))
    setEditingMessageId(null)
    setEditingContent("")
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  const handleRegenerateResponse = (messageId: string) => {
    // 해당 메시지 이후의 모든 메시지 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1]
      if (previousUserMessage.role === "user") {
        // 해당 답변 이후의 모든 메시지 제거
        setMessages(messages.slice(0, messageIndex))

        // 로그인 후 답변 재생성 (1초 후)
        setTimeout(() => {
          const newAssistantMessage: Message = {
            id: generateUniqueId("assistant"),
            role: "assistant",
            content:
              "시뮬레이션을 위해 제작된 부분에 대해 LLM API 출력 후 답변을 받아 결과를 보여드리게 됩니다. 본인의 카드 약관이나 BC카드 고객센터를 통해 확인하시는 것이 좋습니다.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, newAssistantMessage])
          // 생성된 답변 추가 후 부드러운 스크롤
          setTimeout(() => scrollToBottomSmooth(), 100)
        }, 1000)
      }
    }
  }

  const handleSubmit = () => {
    if (inputValue.trim() && selectedModel && chatId && session?.user?.id) {
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
      sendMessageToAI(messageContent, {
        id: selectedModel.id,
        type: selectedModel.type
      })
    }
  }

  return (
    <Layout currentPage="chat">
      {/* 메시지 컨테이너 */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="messages-container flex-1 overflow-y-auto p-4 pb-[140px]"
          style={{ scrollBehavior: 'auto' }}
        >
          <div className="max-w-3xl mx-auto">
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
                    editingMessageId={editingMessageId}
                    editingContent={editingContent}
                    setEditingContent={setEditingContent}
                    copiedMessageId={copiedMessageId}
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
          handleInputChange={handleInputChange}
          handleKeyDown={handleKeyDown}
          handleKeyUp={handleKeyUp}
          handleSubmit={handleSubmit}
          setIsGlobeActive={setIsGlobeActive}
          setIsFlaskActive={setIsFlaskActive}
        />
      </div>
    </Layout>
  )
}
