"use client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, FlaskRoundIcon as Flask, Zap, Send } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import Layout from "@/components/layout/layout"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n"
import { useModel, type Agent, type PublicModel } from "@/components/providers/model-provider"

// 타입은 model-provider에서 import

interface EmptyChatProps {
  initialAgents?: Agent[]
  initialPublicModels?: PublicModel[]
  defaultModel?: Agent | PublicModel | null
}

export default function Component({ initialAgents, initialPublicModels, defaultModel }: EmptyChatProps = {}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGlobeActive, setIsGlobeActive] = useState(false)
  const [isFlaskActive, setIsFlaskActive] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // navbar에서 선택된 모델 사용
  const { selectedModel, setInitialData } = useModel()

  const router = useRouter()
  const { lang } = useTranslation("chat")
  
  // 초기 데이터가 있으면 설정
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
    
    // 한 줄일 때는 스크롤바 숨김, 두 줄 이상일 때만 스크롤바 표시
    const lineHeight = 24 // 대략적인 줄 높이 (text-sm leading-6)
    const singleLineHeight = 48 + lineHeight // minHeight + 한 줄
    
    if (newHeight <= singleLineHeight) {
      textarea.style.overflowY = "hidden"
    } else {
      textarea.style.overflowY = "auto"
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    // 상태 표시/숨김을 빈 값일 때만 체크 (상태 변경 최소화)
    const isEmpty = value.trim().length === 0
    setIsExpanded(prev => {
      if (isEmpty && prev) return false
      if (!isEmpty && !prev) return true
      return prev
    })
  }, [])

  // input 이벤트로 높이 조정 (onChange와 분리)
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    adjustTextareaHeight(textarea)
  }, [adjustTextareaHeight])

  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() && !isSubmitting && selectedModel) {
      setIsSubmitting(true)
      
      try {
        console.log('=== 클라이언트: 채팅 세션 생성 요청 시작 ===')
        console.log('선택된 모델:', selectedModel)
        console.log('초기 메시지:', inputValue)
        
        // 새로운 채팅 세션 생성 API 호출
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: selectedModel.type === 'agent' ? selectedModel.id : undefined,
            modelId: selectedModel.type === 'model' ? selectedModel.id : undefined,
            modelType: selectedModel.type,
            initialMessage: inputValue
          })
        })

        console.log('=== 클라이언트: 응답 받음 ===')
        console.log('응답 상태:', response.status)
        console.log('응답 OK:', response.ok)
        console.log('응답 헤더:', response.headers)

        if (!response.ok) {
          const errorText = await response.text()
          console.log('오류 응답 내용:', errorText)
          throw new Error(`채팅 세션 생성에 실패했습니다 (${response.status}: ${errorText})`)
        }

        const data = await response.json()
        console.log('=== 클라이언트: 응답 데이터 ===')
        console.log('응답 데이터:', data)
        
        const chatId = data.chatId
        console.log('채팅 ID:', chatId)

        // 에이전트 정보를 localStorage에 저장 (스트리밍 응답용)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`chat_${chatId}_agent`, JSON.stringify({
            id: selectedModel.id,
            type: selectedModel.type
          }))
        }

        // 사이드바 새로고침 (새 채팅이 목록에 표시되도록)
        if (typeof window !== 'undefined' && (window as any).refreshSidebar) {
          (window as any).refreshSidebar()
        }

        // 생성된 채팅 ID로 페이지 이동 (URL에 민감한 정보 노출 없음)
        router.push(`/chat/${chatId}`)
        
        // 입력창 초기화
        setInputValue("")
        setIsExpanded(false)
        
        // 높이 리셋
        if (textareaRef.current) {
          textareaRef.current.style.height = "48px"
        }
        
      } catch (error) {
        console.error('=== 클라이언트: 채팅 세션 생성 오류 ===')
        console.error('오류 상세:', error)
        if (error instanceof Error) {
          console.error('오류 스택:', error.stack)
        }
        // 오류 처리 - 사용자에게 알림 표시
        alert('채팅을 시작하는데 실패했습니다. 다시 시도해주세요.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [inputValue, router, isSubmitting, selectedModel])

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

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
  }, [])

  const handlePromptClick = useCallback((prompt: string) => {
    setInputValue(prompt)
    setIsExpanded(true)
    
    // textarea에 포커스 설정
    if (textareaRef.current) {
      textareaRef.current.focus()
      // 높이 조정
      adjustTextareaHeight(textareaRef.current)
    }
  }, [adjustTextareaHeight])

  // 에이전트 또는 모델 선택 핸들러


  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current)
    }
  }, [])

  // 이미지 데이터 처리 함수
  const getAvatarContent = (model: Agent | PublicModel | null) => {
    if (!model) return 'AI'
    
    // 에이전트이고 이미지가 있는 경우
    if (model.type === 'agent' && (model as Agent).imageData) {
      return <img src={`data:image/png;base64,${(model as Agent).imageData}`} alt={(model as Agent).name || ''} />
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
    <Layout currentPage="chat">
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Initial State Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full pb-32 md:pb-6">
          {/* 모델 선택 영역 - 새로 추가 */}

          
          {/* 선택된 모델 이름 */}
          {selectedModel && (
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className={`${getAvatarBackground(selectedModel)} text-white text-lg font-bold`}>
                  {getAvatarContent(selectedModel)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold">
                  {selectedModel.type === 'agent' ? (selectedModel as Agent).name : (selectedModel as PublicModel).modelId}
                </h1>
                <p className="text-sm text-gray-500">
                  {selectedModel.type === 'agent' 
                    ? `${(selectedModel as Agent).modelName} (${(selectedModel as Agent).modelProvider})` 
                    : (selectedModel as PublicModel).provider}
                </p>
              </div>
            </div>
          )}

          {/* 기본 모델 표시 (선택된 모델이 없는 경우) */}
          {!selectedModel && (
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-red-500 text-white text-lg font-bold">G</AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-semibold">gemma3:27b-it-qat</h1>
            </div>
          )}

          {/* Model Description */}
          <div className="text-center mb-12">
            {selectedModel ? (
              <>
                <p className="text-gray-600 text-lg">
                  {selectedModel.type === 'agent' 
                    ? (selectedModel as Agent).description || lang("modelDescription")
                    : lang("modelDescription")
                  }
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {lang("capabilities")}
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-lg">
                  {lang("modelDescription")}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {lang("capabilities")}
                </p>
              </>
            )}
          </div>

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
    </Layout>
  )
}
