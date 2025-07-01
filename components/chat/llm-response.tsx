"use client"

import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Check } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useState } from "react"

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
  isStreaming?: boolean
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
  isStreaming = false,
}: LlmResponseProps) {
  const [thumbsUpHover, setThumbsUpHover] = useState(false)
  const [thumbsUpClick, setThumbsUpClick] = useState(false)
  const [thumbsDownHover, setThumbsDownHover] = useState(false)
  const { lang } = useTranslation('chat')

  const handleLikeClick = () => {
    onLike(id)
    setThumbsUpClick(true)
    setTimeout(() => setThumbsUpClick(false), 500)
  }

  return (
    <div className="flex items-start gap-0 max-w-[100%] leading-[2.1] tracking-wide">
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
            title={copiedMessageId === id ? lang('actions.copied') : lang('actions.copy')}
          >
            {copiedMessageId === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLikeClick}
            onMouseEnter={() => setThumbsUpHover(true)}
            onMouseLeave={() => setThumbsUpHover(false)}
            className={`p-1 rounded-full transition-all duration-200 ${
              likedMessages.has(id) ? "scale-110" : "hover:bg-gray-100"
            }`}
            title={lang('actions.like')}
          >
            <ThumbsUp
              className={`h-4 w-4 transition-transform duration-200 ${
                likedMessages.has(id) ? "fill-current text-blue-600" : "text-gray-500"
              } ${
                thumbsUpClick ? "thumbs-up-click" : thumbsUpHover ? "thumbs-up-hover" : ""
              }`}
            />
          </button>
          <button
            onClick={() => onDislike(id)}
            onMouseEnter={() => setThumbsDownHover(true)}
            onMouseLeave={() => setThumbsDownHover(false)}
            className={`p-1 rounded-full transition-all duration-200 ${
              dislikedMessages.has(id) ? "scale-110" : "hover:bg-gray-100"
            }`}
            title={lang('actions.dislike')}
          >
            <ThumbsDown
              className={`h-4 w-4 transition-transform duration-200 ${
                dislikedMessages.has(id) ? "fill-current text-red-600" : "text-gray-500"
              } ${
                thumbsDownHover ? "thumbs-down-hover" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
