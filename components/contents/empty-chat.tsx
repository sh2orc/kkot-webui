"use client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, FlaskRoundIcon as Flask, Zap, Send } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import Layout from "@/components/layout/layout"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n"

export default function Component() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGlobeActive, setIsGlobeActive] = useState(false)
  const [isFlaskActive, setIsFlaskActive] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const { lang } = useTranslation("chat")

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
              {lang("modelDescription")}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {lang("capabilities")}
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
                      placeholder={lang("placeholder")}
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
                        className={`h-10 w-10 rounded-full ${isFlaskActive ? "bg-black text-white hover:bg-gray-800 hover:text-white" : "hover:bg-transparent"}`}
                        onClick={() => setIsFlaskActive(!isFlaskActive)}
                      >
                        <Flask className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isGlobeActive ? "bg-black text-white hover:bg-gray-800 hover:text-white" : "hover:bg-transparent"}`}
                        onClick={() => setIsGlobeActive(!isGlobeActive)}
                      >
                        <Globe className="h-5 w-5" />
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || isSubmitting}
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
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || isSubmitting}
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
