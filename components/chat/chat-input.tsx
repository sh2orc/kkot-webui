"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, FlaskRoundIcon as Flask, Send } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "@/lib/i18n"

interface ChatInputProps {
  inputValue: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  isGlobeActive: boolean
  isFlaskActive: boolean
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleSubmit: () => void
  setIsGlobeActive: (active: boolean) => void
  setIsFlaskActive: (active: boolean) => void
}

export function ChatInput({
  inputValue,
  textareaRef,
  isGlobeActive,
  isFlaskActive,
  handleInputChange,
  handleKeyDown,
  handleKeyUp,
  handleSubmit,
  setIsGlobeActive,
  setIsFlaskActive,
}: ChatInputProps) {
  const { lang } = useTranslation("chat")
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex-1 flex flex-col relative w-full shadow-lg rounded-xl border border-gray-200 hover:border-gray-300 focus-within:border-gray-300 transition bg-white">
          <div className="flex flex-col p-3">
            {/* 텍스트 영역 */}
            <div className="relative flex items-end">
              <textarea
                ref={textareaRef}
                placeholder={lang("mobilePlaceholder")}
                className="w-full rounded-lg border-0 p-2 pr-12 resize-none overflow-hidden focus:outline-none focus:ring-0 text-sm leading-6 h-[48px] min-h-[48px] max-h-[48px]"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 bottom-3 h-8 w-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* 하단 컨트롤 */}
            <div className="flex items-center justify-between mt-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-gray-100">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-full hover:bg-gray-100 ${isFlaskActive ? "bg-black text-white hover:bg-black hover:text-white" : ""}`}
                  onClick={() => setIsFlaskActive(!isFlaskActive)}
                >
                  <Flask className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-full hover:bg-gray-100 ${isGlobeActive ? "bg-black text-white hover:bg-black hover:text-white" : ""}`}
                  onClick={() => setIsGlobeActive(!isGlobeActive)}
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-center text-gray-400 mt-2">
          {lang("disclaimer")}
        </div>
      </div>
    </div>
  )
}
