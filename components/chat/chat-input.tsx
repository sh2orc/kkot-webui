"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, FlaskRoundIcon as Flask, Play, Square } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "@/lib/i18n"
import { memo } from "react"

interface ChatInputProps {
  inputValue: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  isGlobeActive: boolean
  isFlaskActive: boolean
  isStreaming: boolean
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleSubmit: () => void
  handleAbort: () => void
  setIsGlobeActive: (active: boolean) => void
  setIsFlaskActive: (active: boolean) => void
}

export const ChatInput = memo(function ChatInput({
  inputValue,
  textareaRef,
  isGlobeActive,
  isFlaskActive,
  isStreaming,
  handleInputChange,
  handleKeyDown,
  handleKeyUp,
  handleSubmit,
  handleAbort,
  setIsGlobeActive,
  setIsFlaskActive,
}: ChatInputProps) {
  const { lang } = useTranslation("chat")
  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 bg-white chat-input-container mobile-keyboard-adjust">
      <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
        <div className="flex-1 flex flex-col relative w-full shadow-lg rounded-xl border border-gray-200 hover:border-gray-300 focus-within:border-gray-300 transition bg-white">
          <div className="flex flex-col p-2 sm:p-3">
            {/* Text area */}
            <div className="relative flex items-end">
              <textarea
                ref={textareaRef}
                placeholder={isStreaming ? lang("waitingResponse") || "AI가 답변을 생성 중입니다..." : lang("mobilePlaceholder")}
                className={`w-full rounded-lg border-0 p-3 pr-12 sm:pr-14 resize-none overflow-hidden focus:outline-none focus:ring-0 text-base leading-6 h-[52px] sm:h-[52px] min-h-[52px] max-h-[120px] sm:max-h-[52px] touch-manipulation ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                disabled={isStreaming}
              />
              <Button
                variant="default"
                size="icon"
                className={`absolute right-2 sm:right-2 bottom-3 sm:bottom-3 h-9 w-9 sm:h-9 sm:w-9 rounded-full text-white bg-black hover:bg-gray-800 hover:text-white touch-manipulation`}
                onClick={isStreaming ? handleAbort : handleSubmit}
                disabled={!isStreaming && !inputValue.trim()}
              >
                {isStreaming ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-between mt-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-9 sm:w-9 touch-manipulation">
                <Plus className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-2">
                <Button variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation ${isFlaskActive ? "bg-black text-white hover:bg-blue-700 hover:text-white" : ""}`}
                  onClick={() => setIsFlaskActive(!isFlaskActive)}
                >
                  <Flask className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation ${isGlobeActive ? "bg-black text-white hover:bg-blue-700 hover:text-white" : ""}`}
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
})
