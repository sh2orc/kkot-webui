"use client"

import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Check } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface LlmResponseProps {
  id: string
  content: string
  timestamp: Date
  onCopy: (content: string, messageId: string) => void
  onLike: (messageId: string) => void
  onDislike: (messageId: string) => void
  onRegenerate: (messageId: string) => void
  copiedMessageId: string | null
  likedMessages: Set<string>
  dislikedMessages: Set<string>
}

export function LlmResponse({
  id,
  content,
  timestamp,
  onCopy,
  onLike,
  onDislike,
  onRegenerate,
  copiedMessageId,
  likedMessages,
  dislikedMessages,
}: LlmResponseProps) {
  return (
    <div className="flex items-start gap-0 max-w-[100%] text-sm leading-[2.1] tracking-wide">
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap">{content}</div>
        <div className="text-xs text-gray-400 mt-1">
                          {(timestamp instanceof Date ? timestamp : new Date(timestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => onCopy(content, id)}
            className={`p-1 rounded-full transition-all duration-200 ${
              copiedMessageId === id ? "bg-green-100 text-green-600 scale-110" : "hover:bg-gray-100 text-gray-500"
            }`}
            title={copiedMessageId === id ? "복사됨" : "복사"}
          >
            {copiedMessageId === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onLike(id)}
            className={`p-1 rounded-full transition-all duration-200 ${
              likedMessages.has(id) ? "bg-blue-100 text-blue-600 scale-110" : "hover:bg-gray-100 text-gray-500"
            }`}
            title="좋아요"
          >
            <ThumbsUp
              className={`h-4 w-4 transition-transform duration-200 ${likedMessages.has(id) ? "fill-current" : ""}`}
            />
          </button>
          <button
            onClick={() => onDislike(id)}
            className={`p-1 rounded-full transition-all duration-200 ${
              dislikedMessages.has(id) ? "bg-red-100 text-red-600 scale-110" : "hover:bg-gray-100 text-gray-500"
            }`}
            title="싫어요"
          >
            <ThumbsDown
              className={`h-4 w-4 transition-transform duration-200 ${dislikedMessages.has(id) ? "fill-current" : ""}`}
            />
          </button>
          <button
            onClick={() => onRegenerate(id)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title="다시 생성"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  )
}
