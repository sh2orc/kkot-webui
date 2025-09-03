"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Globe, Plus, Play, Square, Image as ImageIcon, X, Brain } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "@/lib/i18n"
import { memo, useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import type { Agent } from "@/components/providers/model-provider"

interface ChatInputProps {
  inputValue: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  isGlobeActive: boolean
  isDeepResearchActive: boolean
  isStreaming: boolean
  isSubmitting?: boolean
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleCompositionStart?: () => void
  handleCompositionEnd?: () => void
  handleSubmit: () => void
  handleAbort: () => void
  setIsGlobeActive: (active: boolean) => void
  setIsDeepResearchActive: (active: boolean) => void
  onImageUpload?: (images: File[]) => void
  clearImages?: boolean
  supportsMultimodal?: boolean
  selectedAgent?: Agent | null
}

export const ChatInput = memo(function ChatInput({
  inputValue,
  textareaRef,
  isGlobeActive,
  isDeepResearchActive,
  isStreaming,
  isSubmitting = false,
  handleInputChange,
  handleKeyDown,
  handleKeyUp,
  handleCompositionStart,
  handleCompositionEnd,
  handleSubmit,
  handleAbort,
  setIsGlobeActive,
  setIsDeepResearchActive,
  onImageUpload,
  clearImages,
  supportsMultimodal = false,
  selectedAgent = null,
}: ChatInputProps) {
  const { lang } = useTranslation("chat")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if agent features are supported
  const supportsDeepResearch = selectedAgent?.supportsDeepResearch ?? true
  const supportsWebSearch = selectedAgent?.supportsWebSearch ?? true

  // Clear images function
  const clearImagesHandler = () => {

    setUploadedImages([])
    setImagePreviews([])
    
    // Also reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Clear images when clearImages prop changes (skip initial render)
  const isFirstRender = useRef(true)
  useEffect(() => {
    
    // Skip the first render to avoid clearing images on mount
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    
    // Clear images on any change of clearImages prop (toggle behavior)

    clearImagesHandler()
  }, [clearImages])

  // Image resize and compression function
  const resizeAndCompressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        // Set maximum size (reduced to 512px)
        const maxSize = 512
        let { width, height } = img
        
        // Maintain aspect ratio while resizing
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to compressed image (JPEG, quality 0.6 for more compression)
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Return original if compression fails
          }
        }, 'image/jpeg', 0.6)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Filter image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error("Only image files can be uploaded.")
      return
    }

    // Total image count limit (max 3)
    if (uploadedImages.length + imageFiles.length > 3) {
      toast.error("You can upload up to 3 images.")
      return
    }

    try {
      // Resize and compress all images
      const processedImages = await Promise.all(
        imageFiles.map(file => resizeAndCompressImage(file))
      )

      // Check file size after compression (2MB)
      const maxSize = 2 * 1024 * 1024
      const oversizedFiles = processedImages.filter(file => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        toast.error("Image is still too large after compression. Please select a different image.")
        return
      }

      // Create image previews
      const newPreviews: string[] = []
      const processedFiles: File[] = []

      processedImages.forEach((file, index) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          newPreviews.push(result)
          processedFiles.push(file)
          
          // Update state when all images are loaded
          if (newPreviews.length === processedImages.length) {
            setUploadedImages(prev => [...prev, ...processedFiles])
            setImagePreviews(prev => [...prev, ...newPreviews])
            
            // Notify parent component of image upload
            if (onImageUpload) {
              onImageUpload([...uploadedImages, ...processedFiles])
            }
            
            // Compression success notification
            const originalSize = imageFiles.reduce((sum, file) => sum + file.size, 0)
            const compressedSize = processedFiles.reduce((sum, file) => sum + file.size, 0)
            const savedPercent = Math.round((1 - compressedSize / originalSize) * 100)
            
            if (savedPercent > 10) {
              toast.success(`Images compressed by ${savedPercent}% and uploaded successfully.`)
            }
          }
        }
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Image processing error:', error)
      toast.error("An error occurred while processing the images.")
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    setUploadedImages(newImages)
    setImagePreviews(newPreviews)
    
    // Notify parent component of update
    if (onImageUpload) {
      onImageUpload(newImages)
    }
  }

  const handleSubmitClick = () => {
    // Check text length (stricter when images are present)
    const maxTextLength = uploadedImages.length > 0 ? 500 : 4000
    if (inputValue.trim().length > maxTextLength) {
      toast.error(`Message is too long. ${uploadedImages.length > 0 ? 'When sending with images, ' : ''}Maximum ${maxTextLength} characters allowed.`)
      return
    }


    handleSubmit()
    
    // Always clear images after submitting (whether there are images or not)
    clearImagesHandler()
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 p-0 chat-input-container mobile-keyboard-adjust">
      <div className="max-w-full mx-3 sm:max-w-2xl lg:max-w-4xl sm:mx-auto bg-white dark:bg-gray-900">
        <div className="flex-1 flex flex-col relative w-full shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus-within:border-gray-300 dark:focus-within:border-gray-600 transition bg-white dark:bg-gray-800">
          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Uploaded image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col p-2 sm:p-3">
            {/* Text area */}
            <div className="relative flex items-end">
              <textarea
                ref={textareaRef}
                placeholder={lang("mobilePlaceholder")}
                className={`w-full rounded-lg border-0 p-1 ${supportsMultimodal ? 'pr-16 sm:pr-20' : 'pr-12 sm:pr-14'} resize-none overflow-hidden focus:outline-none focus:ring-0 text-base leading-6 min-h-[52px] max-h-[120px] sm:max-h-[180px] touch-manipulation bg-transparent dark:text-gray-200 placeholder:text-gray-500 dark:placeholder:text-gray-400`}
                style={{
                  height: 'auto',
                  minHeight: '52px',
                  maxHeight: window.innerHeight * 0.4 + 'px'
                }}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, window.innerHeight * 0.3) + 'px';
                }}
              />
              <Button
                variant="default"
                size="icon"
                className={`absolute right-0 bottom-2 sm:bottom-3 h-6 w-6 sm:h-9 sm:w-9 rounded-full text-white bg-black dark:bg-gray-200 dark:text-black hover:bg-gray-800 dark:hover:bg-gray-300 hover:text-white dark:hover:text-black touch-manipulation`}
                onClick={isStreaming ? handleAbort : handleSubmitClick}
                disabled={isStreaming ? false : ((!inputValue.trim() && uploadedImages.length === 0) || isSubmitting)}
              >
                {isStreaming ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Text length indicator */}
            {(inputValue.length > 500 || uploadedImages.length > 0) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                {inputValue.length}/{uploadedImages.length > 0 ? 1000 : 4000} characters
                {uploadedImages.length > 0 && (
                  <span className="ml-2 text-orange-600">
                    {uploadedImages.length} images (text limit: 1000 characters)
                  </span>
                )}
              </div>
            )}

            {/* Bottom controls */}
            <div className="flex items-center justify-between mt-2 sm:mt-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation">
                  <Plus className="h-4 w-4" />
                </Button>
                {supportsMultimodal && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-2">
                <Button variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 touch-manipulation">
                  <Mic className="h-4 w-4" />
                </Button>
                {supportsDeepResearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation ${isDeepResearchActive ? "bg-cyan-700 text-white hover:bg-cyan-800 hover:text-white dark:bg-cyan-600 dark:hover:bg-cyan-700" : ""}`}
                    onClick={() => {
                      const newState = !isDeepResearchActive;
                      setIsDeepResearchActive(newState);
                      
                      // Update localStorage (only if current chat ID exists)
                      if (typeof window !== 'undefined') {
                        const currentChatId = window.location.pathname.split('/').pop();
                        if (currentChatId && currentChatId !== 'chat') {
                          if (newState) {
                            localStorage.setItem(`chat_${currentChatId}_deepResearch`, 'true');
                          } else {
                            localStorage.removeItem(`chat_${currentChatId}_deepResearch`);
                          }
                        }
                      }
                      

                    }}
                  >
                    <Brain className="h-4 w-4" />
                  </Button>
                )}
                {supportsWebSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation ${isGlobeActive ? "bg-cyan-700 text-white hover:bg-cyan-800 hover:text-white dark:bg-cyan-600 dark:hover:bg-cyan-700" : ""}`}
                    onClick={() => setIsGlobeActive(!isGlobeActive)}
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-center text-gray-400 dark:text-gray-500 pb-2 mt-3 ">
          {lang("disclaimer")}
        </div>
      </div>
    </div>
  )
})

// New type definition - Image information
export interface ImagePreview {
  file: File
  preview: string
}

// Image utility functions
export const createImageContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
