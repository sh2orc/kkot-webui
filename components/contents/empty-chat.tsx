"use client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, FlaskRoundIcon as Flask, Zap, Send } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import Layout from "../layout/layout"
import { useRouter } from "next/navigation"

export default function Component() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGlobeActive, setIsGlobeActive] = useState(false)
  const [isFlaskActive, setIsFlaskActive] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()

  const prompts = [
    {
      title: "재미있는 사실 알려주세요",
      description: "토픽 제공에 대해",
    },
    {
      title: "코드 스니펫 보여주세요",
      description: "웹사이트와 고성 예시",
    },
    {
      title: "아이디어를 주세요",
      description: "아이디어 마음 직접으로 부정한 답 수 있습니다",
    },
    {
      title: "AI를 활용한 마케팅 전략을 알려주세요",
      description: "비즈니스 성장을 위한 실용적인 조언",
    },
  ]

  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "48px"
    const newHeight = Math.min(textarea.scrollHeight, 400)
    textarea.style.height = `${newHeight}px`
    
    // 한 줄일 때는 스크롤바 숨김, 두 줄 이상일 때만 스크롤바 표시
    const lineHeight = 24 // 대략적인 한 줄 높이 (text-sm leading-6)
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
    
    // 제안 표시/숨김은 빈 값일 때만 체크 (상태 변경 최소화)
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
    }

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: 줄바꿈 허용 (기본 동작)
        return
      } else {
        // Enter만: submit 동작
        e.preventDefault()
        if (inputValue.trim() && !isSubmitting) {
          setIsSubmitting(true)
          
          // 새로운 채팅 ID 생성
          const newChatId = `chat-${Date.now()}`

          // 새로운 채팅 페이지로 이동하면서 입력값을 쿼리 파라미터로 전달
          router.push(`/chat/${newChatId}?message=${encodeURIComponent(inputValue)}`)
          
          // 입력창 초기화
          setInputValue("")
          setIsExpanded(false)
          
          // 높이 리셋
          if (textareaRef.current) {
            textareaRef.current.style.height = "48px"
          }
          
          // 잠시 후 submit 상태 해제
          setTimeout(() => setIsSubmitting(false), 1000)
        }
      }
    }
  }, [inputValue, router, isSubmitting])

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
  }, [])

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !isSubmitting) {
      setIsSubmitting(true)
      
      // 새로운 채팅 ID 생성
      const newChatId = `chat-${Date.now()}`

      // 새로운 채팅 페이지로 이동하면서 입력값을 쿼리 파라미터로 전달
      router.push(`/chat/${newChatId}?message=${encodeURIComponent(inputValue)}`)
      
      // 입력창 초기화
      setInputValue("")
      setIsExpanded(false)
      
      // 높이 리셋
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px"
      }
      
      // 잠시 후 submit 상태 해제
      setTimeout(() => setIsSubmitting(false), 1000)
    }
  }, [inputValue, router, isSubmitting])

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

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current)
    }
  }, [])

  return (
    <Layout currentPage="chat">
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Initial State Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full pb-32 md:pb-6">
          {/* Model Name */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-red-500 text-white text-lg font-bold">G</AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-semibold">gemma3:27b-it-qat</h1>
          </div>

          {/* Model Description */}
          <div className="text-center mb-12">
            <p className="text-gray-600 text-lg">
              Google의 최신 언어 모델로, 다양한 질문에 정확하고 도움이 되는 답변을 제공합니다.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              창의적 글쓰기, 코딩, 분석, 번역 등 다양한 작업을 도와드릴 수 있습니다.
            </p>
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
                      placeholder="오늘 어떻게 도와드릴까요?"
                      className="w-full rounded-lg border border-gray-200 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-400 text-sm leading-6 min-h-[48px] max-h-[300px]"
                      value={inputValue}
                      onChange={handleInputChange}
                      onInput={handleInput}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                    />
                  </div>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                      <Plus className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10">
                        <Mic className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isFlaskActive ? "bg-black text-white hover:bg-gray-800" : ""}`}
                        onClick={() => setIsFlaskActive(!isFlaskActive)}
                      >
                        <Flask className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isGlobeActive ? "bg-black text-white hover:bg-gray-800" : ""}`}
                        onClick={() => setIsGlobeActive(!isGlobeActive)}
                      >
                        <Globe className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || isSubmitting}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Input */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      placeholder="오늘 어떻게 도와드릴까요?"
                      className="w-full rounded-lg border border-gray-300 p-3 pr-12 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm leading-6 min-h-[48px] max-h-[300px]"
                      value={inputValue}
                      onChange={handleInputChange}
                      onInput={handleInput}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 bottom-2 h-8 w-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
                      onClick={handleSubmit}
                      disabled={!inputValue.trim() || isSubmitting}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                      <Plus className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                        <Mic className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isFlaskActive ? "bg-black text-white hover:bg-gray-800" : ""}`}
                        onClick={() => setIsFlaskActive(!isFlaskActive)}
                      >
                        <Flask className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isGlobeActive ? "bg-black text-white hover:bg-gray-800" : ""}`}
                        onClick={() => setIsGlobeActive(!isGlobeActive)}
                      >
                        <Globe className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt Suggestions - 크기가 커질 때만 숨김 */}
          {!isExpanded && (
            <div className="w-full max-w-3xl transition-opacity duration-300">
              <div className="flex flex-col gap-4">
                {/* Group Label */}
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-500">제안</span>
                </div>

                {/* Prompt Grid - Float 형식 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prompts.map((prompt, index) => (
                    <div
                      key={index}
                      className="group bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                      onClick={() => handlePromptClick(prompt.title)}
                    >
                      <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium text-gray-800 group-hover:text-gray-900 line-clamp-2">
                          {prompt.title}
                        </h3>
                        <p className="text-xs text-gray-500 group-hover:text-gray-600 line-clamp-2">
                          {prompt.description}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <Zap className="h-3 w-3 text-gray-400 group-hover:text-blue-500" />
                        </div>
                        <div className="text-xs text-gray-400 group-hover:text-gray-500">
                          클릭하여 시작
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
