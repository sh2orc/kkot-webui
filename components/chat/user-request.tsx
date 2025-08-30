"use client"

import { Copy, Edit, Check, X, RefreshCw, Image, ZoomIn } from "lucide-react"
import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useTranslation } from "@/lib/i18n"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTimezone } from "@/components/providers/timezone-provider"

interface UserRequestProps {
  id: string
  content: string
  timestamp: Date
  onCopy: (content: string, messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onSave: (messageId: string) => void
  onCancel: () => void
  onRegenerate: (messageId: string) => void
  editingMessageId: string | null
  editingContent: string
  setEditingContent: (content: string) => void
  copiedMessageId: string | null
  isStreaming?: boolean
  regeneratingMessageId?: string | null
}

export function UserRequest({
  id,
  content,
  timestamp,
  onCopy,
  onEdit,
  onSave,
  onCancel,
  onRegenerate,
  editingMessageId,
  editingContent,
  setEditingContent,
  copiedMessageId,
  isStreaming = false,
  regeneratingMessageId = null,
}: UserRequestProps) {
  const { lang } = useTranslation("chat")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectedImage, setSelectedImage] = useState<{src: string, name: string} | null>(null)
  const { formatTime } = useTimezone()

  // Debug: Tracking regeneration state changes
  useEffect(() => {
    // Always output logs to track all state changes
    console.log(`=== UserRequest ${id.substring(0, 8)}... - State Change ===`)
    console.log('messageId:', id)
    console.log('regeneratingMessageId:', regeneratingMessageId)
    console.log('isStreaming:', isStreaming)
    console.log('Is this message being regenerated:', regeneratingMessageId === id)
    console.log('Button should be disabled:', regeneratingMessageId !== null)
    console.log('Button should be enabled:', regeneratingMessageId === null)
    
    // Also check the actual DOM element state
    const buttonElement = document.querySelector(`[data-message-id="${id}"] button[title*="Generate"]`)
    if (buttonElement) {
      console.log('DOM Button disabled:', buttonElement.hasAttribute('disabled'))
      console.log('DOM Button classes:', buttonElement.className)
    }
  }, [regeneratingMessageId, isStreaming, id])

  // Parse message content to extract text and image information
  const parsedContent = useMemo(() => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.hasImages && parsed.images && Array.isArray(parsed.images)) {
        return {
          text: parsed.text || '',
          images: parsed.images,
          hasImages: true
        }
      }
    } catch (e) {
      // If JSON parsing fails, treat as plain text
    }
    return {
      text: content,
      images: [],
      hasImages: false
    }
  }, [content])

  // Get display text for editing and viewing
  const displayText = parsedContent.hasImages ? parsedContent.text : content

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

  const handleCopy = () => {
    // Copy only the display text, not the full JSON
    const textToCopy = parsedContent.hasImages ? parsedContent.text : content
    onCopy(textToCopy, id)
  }

  const handleEdit = () => {
    // Edit only the display text, not the full JSON  
    const textToEdit = parsedContent.hasImages ? parsedContent.text : content
    onEdit(id, textToEdit)
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
    <div className={`flex items-start leading-relaxed gap-3 ${editingMessageId === id ? "w-full" : "max-w-[80%]"}`}>
      <div className="w-full">
        {editingMessageId === id ? (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 w-full">
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
            <div className="flex mt-2 sm:gap-1">
              <button
                onClick={() => onSave(id)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={lang("actions.saveShortcut")}
              >
                <Check className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button 
                onClick={onCancel} 
                className="p-1 rounded-full hover:bg-red-100 transition-colors" 
                title={lang("actions.cancelShortcut")}
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {lang("actions.editHint")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              {/* Display images if present */}
              {parsedContent.hasImages && parsedContent.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {parsedContent.images.map((image: any, index: number) => (
                    <div key={index} className="relative group">
                      {image.data ? (
                        /* Image thumbnail */
                        <div 
                          className="relative cursor-pointer rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors w-full sm:w-[400px]"
                          style={{ width: 'min(40vw, 400px)' }}
                          onClick={() => setSelectedImage({src: image.data, name: image.name || `Image ${index + 1}`})}
                        >
                          <img
                            src={image.data}
                            alt={image.name || `Image ${index + 1}`}
                            className="w-full h-auto object-cover rounded-lg"
                          />
                          {/* Overlay with zoom icon */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all duration-200 rounded-lg">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                        </div>
                      ) : (
                        /* Fallback for images without data */
                        <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-lg px-2 py-1">
                          <Image className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {image.name || `Image ${index + 1}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({Math.round(image.size / 1024)}KB)
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Display text content only if there's actual text */}
              {displayText && displayText.trim() && (
                <div className="whitespace-pre-wrap break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  {displayText}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 sm:gap-2">
              <div className="text-xs text-gray-400 dark:text-gray-500">
              {(() => {
                  let displayTime: Date;
                  if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
                    displayTime = timestamp;
                  } else if (timestamp) {
                    displayTime = new Date(timestamp);
                    if (isNaN(displayTime.getTime())) {
                      displayTime = new Date();
                    }
                  } else {
                    displayTime = new Date();
                  }
                  const { language } = useTranslation('chat');
                  return formatTime(displayTime, language === 'kor' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                })()}
              </div>
              <div className="flex sm:gap-1 space-x-3 sm:space-x-1 md:space-x-0">
                <button
                  onClick={handleCopy}
                  className={`sm:p-1 rounded-full transition-all duration-200 ${
                    copiedMessageId === id ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                  title={copiedMessageId === id ? lang("actions.copied") : lang("actions.copy")}
                >
                  {copiedMessageId === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleEdit}
                  className="sm:p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={lang("actions.edit")}
                >
                  <Edit className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  data-message-id={id}
                  onClick={() => {
                    console.log('=== Regenerate button clicked ===')
                    console.log('messageId:', id)
                    console.log('regeneratingMessageId:', regeneratingMessageId)
                    console.log('isStreaming:', isStreaming)
                    console.log('Button disabled state:', regeneratingMessageId !== null)
                    
                    // Prevent multiple clicks during regeneration or when this specific message is being regenerated
                    if (regeneratingMessageId === id || regeneratingMessageId !== null) {
                      console.log('Regeneration already in progress, blocking click')
                      return;
                    }
                    
                    console.log('Calling onRegenerate with messageId:', id)
                    onRegenerate(id);
                  }}
                  disabled={regeneratingMessageId !== null}
                  className={`relative rounded-full transition-all duration-600 group ${
                    regeneratingMessageId !== null
                      ? 'cursor-not-allowed opacity-50' 
                      : 'hover:bg-blue-50 hover:text-blue-600'
                  }`}
                  title={
                    regeneratingMessageId === id 
                      ? lang("actions.regenerating") 
                      : lang("actions.regenerate")
                  }
                >
                  <RefreshCw className={`h-4 w-4 transition-all duration-600 ${
                    regeneratingMessageId === id 
                      ? 'text-gray-500 dark:text-gray-400 animate-slow-spin' 
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:rotate-180'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-lg font-semibold">
              {selectedImage?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-2">
            {selectedImage && (
              <div className="flex justify-center">
                <img
                  src={selectedImage.src}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
