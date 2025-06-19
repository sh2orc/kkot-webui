"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Layout from "@/components/layout/layout"
import { LlmResponse } from "@/components/chat/llm-response"
import { UserRequest } from "@/components/chat/user-request"
import { ChatInput } from "@/components/chat/chat-input"

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

  // 고유한 ID 생성 함수
  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // 채팅 ID에 따라 메시지 로드
  useEffect(() => {
    if (chatId) {
      // 실제로는 API에서 채팅 내역을 가져와야 함
      // 여기서는 더미 데이터 사용
      const dummyMessages: Message[] = [
        {
          id: generateUniqueId("user"),
          role: "user",
          content: "안녕하세요, BC카드의 페이백 서비스에 대해 알려주세요.",
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5분 전
        },
        {
          id: generateUniqueId("assistant"),
          role: "assistant",
          content:
            "안녕하세요! BC카드의 페이백 서비스는 고객이 결제한 금액의 일부를 현금으로 돌려받을 수 있는 서비스입니다. 주요 특징은 다음과 같습니다:\n\n1. 결제 금액의 일정 비율(보통 0.5~1%)을 현금으로 적립\n2. 적립된 금액은 다음 달 카드 청구액에서 자동 차감\n3. 특정 가맹점이나 프로모션 기간에는 추가 페이백 혜택 제공\n4. 연회비가 있는 카드의 경우 더 높은 페이백 비율 적용\n\n더 구체적인 정보가 필요하시면 특정 BC카드 상품명이나 관심 있는 부분을 알려주세요.",
          timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4분 전
        },
        {
          id: generateUniqueId("user"),
          role: "user",
          content: "페이백 서비스를 받기 위한 최소 결제 금액이 있나요?",
          timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3분 전
        },
        {
          id: generateUniqueId("assistant"),
          role: "assistant",
          content:
            "네, BC카드의 페이백 서비스는 일반적으로 최소 결제 금액 기준이 있습니다. 카드 상품별로 차이가 있지만, 대부분의 경우 다음과 같은 조건이 적용됩니다:\n\n1. 일반적으로 월 30만원 이상 사용 시 페이백 혜택이 적용됩니다.\n2. 일부 프리미엄 카드의 경우 월 50만원 이상 사용해야 혜택이 적용되기도 합니다.\n3. 특별 프로모션 기간에는 최소 결제 금액 기준이 낮아지거나 없어지는 경우도 있습니다.\n\n정확한 최소 결제 금액은 고객이 보유한 BC카드 상품에 따라 다르므로, 본인의 카드 약관이나 BC카드 고객센터를 통해 확인하시는 것이 좋습니다.",
          timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2분 전
        },
      ]

      setMessages(dummyMessages)
      
      // 메시지 로드 후 즉시 맨 아래로 이동 (애니메이션 없이)
      setTimeout(() => {
        scrollToBottomInstant()
      }, 0)
    }
  }, [chatId])

  // 초기 메시지 처리
  useEffect(() => {
    const initialMessage = searchParams.get("message")
    if (initialMessage && messages.length === 0) {
      // 사용자 메시지 추가
      const newUserMessage: Message = {
        id: generateUniqueId("user"),
        role: "user",
        content: initialMessage,
        timestamp: new Date(),
      }

      setMessages([newUserMessage])
      
      // 초기 메시지 추가 후 즉시 맨 아래로 이동
      setTimeout(() => scrollToBottomInstant(), 0)

      // AI 응답 시뮬레이션 (1초 후)
      setTimeout(() => {
        const newAssistantMessage: Message = {
          id: generateUniqueId("assistant"),
          role: "assistant",
          content: "안녕하세요! 질문해 주셔서 감사합니다. 어떻게 도와드릴까요?",
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, newAssistantMessage])
        // AI 응답 추가 후 부드러운 스크롤
        setTimeout(() => scrollToBottomSmooth(), 100)
      }, 1000)
    }
  }, [searchParams])

  // 메시지 변경 시 스크롤 처리 (채팅 ID 변경 시에는 동작하지 않도록)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        // 처음 로드 시에는 즉시 맨 아래로
        setTimeout(() => scrollToBottomInstant(), 0)
        setIsInitialLoad(false)
      } else {
        // 새 메시지 추가 시에는 부드러운 스크롤
        setTimeout(() => scrollToBottomSmooth(), 100)
      }
    }
  }, [messages, isInitialLoad])
  
  // chatId가 변경될 때 초기 로드 상태로 리셋
  useEffect(() => {
    setIsInitialLoad(true)
  }, [chatId])

  // 컴포넌트 마운트 시에는 즉시 맨 아래로 이동
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
    // 높이는 고정으로 유지
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // 높이 조정 제거
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
    }

    // Enter 키 submit 제거 - 버튼 클릭으로만 메시지 전송
    // Shift + Enter는 기본 동작(줄바꿈)을 허용
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
        // 싫어요가 눌려있다면 제거
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
        // 좋아요가 눌려있다면 제거
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
    // 해당 메시지 이후의 모든 메시지를 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1]
      if (previousUserMessage.role === "user") {
        // 해당 응답 이후의 모든 메시지 제거
        setMessages(messages.slice(0, messageIndex))

        // 새로운 응답 생성 (1초 후)
        setTimeout(() => {
          const newAssistantMessage: Message = {
            id: generateUniqueId("assistant"),
            role: "assistant",
            content:
              "다시 생성된 응답입니다. 실제 구현 시에는 이 부분에서 LLM API를 다시 호출하여 새로운 응답을 받아오게 됩니다.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, newAssistantMessage])
          // 재생성된 응답 추가 후 부드러운 스크롤
          setTimeout(() => scrollToBottomSmooth(), 100)
        }, 1000)
      }
    }
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      // 새 메시지 추가
      const newUserMessage: Message = {
        id: generateUniqueId("user"),
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      }

      setMessages([...messages, newUserMessage])
      setInputValue("")
      
      // 사용자 메시지 추가 후 부드러운 스크롤
      setTimeout(() => scrollToBottomSmooth(), 100)

      // 텍스트 영역 높이 리셋
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px"
      }

      // 실제로는 여기서 API 호출하여 응답을 받아야 함
      // 더미 응답 추가 (1초 후)
      setTimeout(() => {
        const newAssistantMessage: Message = {
          id: generateUniqueId("assistant"),
          role: "assistant",
          content:
            "죄송합니다만, 현재 데모 버전이라 실제 응답을 생성할 수 없습니다. 실제 구현 시에는 이 부분에서 LLM API를 호출하여 응답을 받아오게 됩니다.",
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, newAssistantMessage])
        // AI 응답 추가 후 부드러운 스크롤
        setTimeout(() => scrollToBottomSmooth(), 100)
      }, 1000)
    }
  }

  return (
    <Layout currentPage="chat">
      {/* 메시지 영역 */}
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

        {/* 입력 영역 - 하단 고정 */}
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
