"use client"

import { Copy, Edit, Check, X } from "lucide-react"
import { useRef, useEffect, useCallback } from "react"
import { useTranslation } from "@/lib/i18n"

interface UserRequestProps {
  id: string
  content: string
  timestamp: Date
  onCopy: (content: string, messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onSave: (messageId: string) => void
  onCancel: () => void
  editingMessageId: string | null
  editingContent: string
  setEditingContent: (content: string) => void
  copiedMessageId: string | null
}

export function UserRequest({
  id,
  content,
  timestamp,
  onCopy,
  onEdit,
  onSave,
  onCancel,
  editingMessageId,
  editingContent,
  setEditingContent,
  copiedMessageId,
}: UserRequestProps) {
  const { lang } = useTranslation("chat")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Function to automatically adjust textarea height
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const newHeight = Math.min(textareaRef.current.scrollHeight, 400) // Limit maximum height to 400px
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [])

  // Adjust height when edit mode is activated or content changes
  useEffect(() => {
    if (editingMessageId === id && textareaRef.current) {
      // Set focus when entering edit mode
      textareaRef.current.focus()
      // Move cursor to end of text
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
      // Adjust height
      setTimeout(() => adjustTextareaHeight(), 0)
    }
  }, [editingMessageId, id, adjustTextareaHeight])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingContent(e.target.value)
  }

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    adjustTextareaHeight()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Save with Ctrl+Enter or Cmd+Enter
      e.preventDefault()
      onSave(id)
    } else if (e.key === "Escape") {
      // Cancel with Escape
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className={`flex items-start text-sm leading-relaxed gap-3 ${editingMessageId === id ? "w-full" : "max-w-[80%]"}`}>
      <div className="w-full">
        {editingMessageId === id ? (
          <div className="bg-gray-100 rounded-lg p-3 w-full">
            <textarea
              ref={textareaRef}
              value={editingContent}
              onChange={handleContentChange}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-0 resize-none focus:outline-none overflow-y-auto"
              style={{ minHeight: "60px", maxHeight: "300px" }}
              placeholder={lang("mobilePlaceholder")}
            />
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => onSave(id)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                title={lang("actions.saveShortcut")}
              >
                <Check className="h-4 w-4 text-gray-700" />
              </button>
              <button 
                onClick={onCancel} 
                className="p-1 rounded-full hover:bg-red-100 transition-colors" 
                title={lang("actions.cancelShortcut")}
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {lang("actions.editHint")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="whitespace-pre-wrap">{content}</div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-400">
                {(timestamp instanceof Date ? timestamp : new Date(timestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onCopy(content, id)}
                  className={`p-1 rounded-full transition-all duration-200 ${
                    copiedMessageId === id ? "bg-green-100 text-green-600 scale-110" : "hover:bg-gray-100 text-gray-500"
                  }`}
                  title={copiedMessageId === id ? lang("actions.copied") : lang("actions.copy")}
                >
                  {copiedMessageId === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onEdit(id, content)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title={lang("actions.edit")}
                >
                  <Edit className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
