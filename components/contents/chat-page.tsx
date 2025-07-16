"use client"

import type React from "react"

import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { LlmResponse } from "@/components/chat/llm-response"
import { UserRequest } from "@/components/chat/user-request"
import { ChatInput } from "@/components/chat/chat-input"
import { useTranslation } from "@/lib/i18n"
import { useModel } from "@/components/providers/model-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { Message, ChatPageProps } from "./chat-types"
import { ChatMessageWrapper } from "./chat-message-wrapper"
import { ChatMessageSkeleton } from "./chat-message-skeleton"

export default function ChatPage({ chatId }: ChatPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  const { lang } = useTranslation('chat')
  const { selectedModel } = useModel()
  const isMobile = useIsMobile()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [isGlobeActive, setIsGlobeActive] = useState(false)
  const [isDeepResearchActive, setIsDeepResearchActive] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set())
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set())
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0)
  
  // Track regeneration state changes globally
  useEffect(() => {
    // Update counter to force re-rendering when regeneration state changes
    setForceUpdateCounter(prev => prev + 1)
  }, [regeneratingMessageId])
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [clearImagesTrigger, setClearImagesTrigger] = useState(false)
  const [deepResearchPlannedSteps, setDeepResearchPlannedSteps] = useState<Array<{ title: string, type: string }>>([])
  // Set safer initial value
  const [dynamicPadding, setDynamicPadding] = useState(() => {
    // Use default value on server side, detect screen size on client
    if (typeof window === 'undefined') return 240
    return window.innerWidth < 768 ? 320 : 160
  })
  
  // Ref to prevent React Strict Mode duplicate execution
  const streamingInProgress = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isScrollingToBottom = useRef(false)
  const lastScrollHeight = useRef(0)
  const lastSubmittedMessage = useRef<string | null>(null)
  const lastSubmittedTime = useRef<number>(0)
  const isSubmittingRef = useRef(false) // Additional duplicate prevention
  
  // Add ref to prevent duplicate deep research calls
  const deepResearchInProgress = useRef<Set<string>>(new Set())

  // Reset padding when isMobile changes
  useEffect(() => {
    if (isMobile !== undefined) {
      const basePadding = isMobile ? 320 : 160
      setDynamicPadding(basePadding)
    }
  }, [isMobile])

  // Load initial deep research and globe state from URL parameters and localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && chatId) {
      const urlParams = new URLSearchParams(window.location.search)
      const urlDeepResearch = urlParams.get('deepResearch') === 'true'
      const urlGlobe = urlParams.get('globe') === 'true'
      
      // Also check localStorage for deep research and globe state
      const localDeepResearch = chatId ? localStorage.getItem(`chat_${chatId}_deepResearch`) === 'true' : false
      const localGlobe = chatId ? localStorage.getItem(`chat_${chatId}_globe`) === 'true' : false
      
      // Use URL parameters first, then localStorage as fallback
      const finalDeepResearch = urlDeepResearch || localDeepResearch
      const finalGlobe = urlGlobe || localGlobe
      
      if (finalDeepResearch) {
        setIsDeepResearchActive(true)
      }
      
      if (finalGlobe) {
        setIsGlobeActive(true)
      }
      
      // Clean up URL parameters after reading (optional)
      if (urlDeepResearch || urlGlobe) {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [chatId])

  // Detect message container height and adjust dynamic padding
  const adjustDynamicPadding = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const containerHeight = container.clientHeight
      const scrollHeight = container.scrollHeight
      const scrollTop = container.scrollTop
      
      // Only adjust padding when scroll is near bottom
      const isNearBottom = scrollHeight - scrollTop - containerHeight < 80
      
      if (isNearBottom) {
        // Check only code blocks in the last message (to prevent excessive padding)
        const lastMessage = container.querySelector('.max-w-3xl > div:last-child')
        let additionalPadding = 0
        
        if (lastMessage) {
          const codeBlocks = lastMessage.querySelectorAll('.code-block')
          if (codeBlocks.length > 0) {
            // Consider only the height of code blocks in the last message
            const lastCodeBlock = codeBlocks[codeBlocks.length - 1]
            const rect = lastCodeBlock.getBoundingClientRect()
            
            // Add additional padding only when code block height is over 150px
            if (rect.height > 150) {
              additionalPadding = Math.min(rect.height * 0.3, 100) // Max 100px additional padding
            }
          }
        }
        
        // Base padding + limited additional padding
        const basePadding = isMobile ? 320 : 160
        const newPadding = Math.max(basePadding, basePadding + additionalPadding)
        
        // Increase threshold to prevent unnecessary padding changes
        const threshold = 30
        
        if (Math.abs(newPadding - dynamicPadding) > threshold) {
          setDynamicPadding(newPadding)
        }
      } else {
        // Restore base padding when scroll is at top
        const basePadding = isMobile ? 320 : 160
        if (dynamicPadding > basePadding) {
          setDynamicPadding(basePadding)
        }
      }
    }
  }, [dynamicPadding, isMobile])

  // Generate unique ID
  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Adjust padding and scroll when streaming stops
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    streamingInProgress.current = false
    setIsStreaming(false)
    setRegeneratingMessageId(null)
    setStreamingMessageId(null)
    
    // Try resetting state multiple times to ensure it's applied
    setTimeout(() => {
      console.log('=== handleAbort - First safety check ===')
      setRegeneratingMessageId(null)
      setIsStreaming(false)
    }, 100)
    
    setTimeout(() => {
      console.log('=== handleAbort - Final safety check ===')
      setRegeneratingMessageId(null)
      setIsStreaming(false)
    }, 500)
    
    // Prevent forced scrolling if user manually scrolled up
    const container = messagesContainerRef.current
    const userScrolled = (container as any)?.userScrolled?.() || false
    
    if (!userScrolled) {
      // Only adjust padding and scroll if user hasn't scrolled
      adjustDynamicPadding()
      scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom
    }
  }

  // Handle image upload from ChatInput
  const handleImageUpload = useCallback((images: File[]) => {
    setUploadedImages(images)
  }, [])

  // Continue with new request after short delay
  // Parallel deep research processing function
  const handleParallelDeepResearch = async (
    subQuestions: string[],
    originalQuery: string,
    modelId: string,
    assistantMessageId: string,
    providedChatId?: string | number
  ) => {
    // Prevent duplicate processing for the same assistant message
    if (deepResearchInProgress.current.has(assistantMessageId)) {
      console.log('🔄 Parallel deep research already in progress for message:', assistantMessageId);
      return;
    }
    
    // Mark as in progress
    deepResearchInProgress.current.add(assistantMessageId);
    
    try {
      
      // Process all sub-questions in parallel (with timeout and retry logic)
      const subQuestionResults = await Promise.all(
        subQuestions.map(async (question, index) => {
          
          // Fetch function with timeout
          const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 90000) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              return response;
            } catch (error) {
              clearTimeout(timeoutId);
              if (controller.signal.aborted) {
                throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
              }
              throw error;
            }
          };
          
          // Retry logic
          let lastError: Error | null = null;
          const maxRetries = 2;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await fetchWithTimeout(`/api/deepresearch/subquestion-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subQuestion: question,
                  originalQuery,
                  modelId,
                  context: '',
                  previousSteps: []
                })
              }, 90000); // 90초 타임아웃 (복잡한 분석을 위해 시간 증가)

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Analysis failed (${response.status}): ${errorText}`);
              }

              const result = await response.json();
              
              // Real-time update on analysis completion - mapping with unique ID
              const stepKey = `subq_${index}_${Date.now()}`;
              setMessages(prev => 
                prev.map(m => 
                  m.id === assistantMessageId 
                    ? { 
                        ...m,
                        deepResearchStepInfo: {
                          ...m.deepResearchStepInfo,
                          [stepKey]: {
                            title: `Analysis: ${question}`,
                            content: result.analysis?.analysis || result.analysis || 'Analysis result is empty.',
                            isComplete: true,
                            index: index,
                            subQuestionId: question,
                            originalQuestion: question
                          }
                        }
                      }
                    : m
                )
              );
              
              return {
                analysis: result.analysis?.analysis || result.analysis || '분석 결과가 비어있습니다.',
                content: result.analysis?.analysis || result.analysis || '분석 결과가 비어있습니다.',
                subQuestionId: question,
                originalQuestion: question,
                index: index
              };
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              
              // If not the last attempt, wait a bit and retry
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }
              
              // Update error state when all attempts fail
              const errorStepKey = `subq_${index}_error_${Date.now()}`;
              setMessages(prev => 
                prev.map(m => 
                  m.id === assistantMessageId 
                    ? { 
                        ...m,
                        deepResearchStepInfo: {
                          ...m.deepResearchStepInfo,
                          [errorStepKey]: {
                            title: `Analysis: ${question}`,
                            content: `❌ Error occurred during analysis (${maxRetries} attempts failed): ${lastError?.message || 'Unknown error'}`,
                            isComplete: false,
                            hasError: true,
                            index: index,
                            subQuestionId: question,
                            originalQuestion: question
                          }
                        }
                      }
                    : m
                )
              );
              
              // Partial failures return null (doesn't interrupt the entire process)
              return null;
            }
          }
          
          return null; // All attempts failed
        })
      );

      // Wait for all analyses to complete
      const analysisResults = await Promise.all(subQuestionResults);
      const validResults = analysisResults.filter(result => result !== null);

      if (validResults.length === 0) {
        throw new Error('All sub-question analyses failed.');
      }

      // fetchWithTimeout 함수 정의 (먼저 정의)
      const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 60000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          if (controller.signal.aborted) {
            throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
          }
          throw error;
        }
      };

      // Perform synthesis analysis (with timeout and retry)
      
      let synthesisResult: any = null;
      const synthesisMaxRetries = 3;
      let synthesisLastError: Error | null = null;
      
      for (let attempt = 1; attempt <= synthesisMaxRetries; attempt++) {
          try {
            const synthesisResponse = await fetchWithTimeout(`/api/deepresearch/synthesis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: originalQuery,
              modelId,
              analysisSteps: validResults.map(result => ({
                analysis: result.analysis || result.content || result,
                subQuestion: result.originalQuestion,
                index: result.index
              }))
            })
          }, 90000); // 90초 타임아웃 (종합 분석은 더 오래 걸릴 수 있음)

          if (!synthesisResponse.ok) {
            const errorText = await synthesisResponse.text();
            throw new Error(`Synthesis failed (${synthesisResponse.status}): ${errorText}`);
          }

          synthesisResult = await synthesisResponse.json();
          break; // Exit loop on success
        } catch (error) {
          synthesisLastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < synthesisMaxRetries) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            throw new Error(`Synthesis failed after ${synthesisMaxRetries} attempts: ${synthesisLastError?.message || 'Unknown error'}`);
          }
        }
      }

      // Update synthesis analysis results
      const synthesisId = `synthesis_${Date.now()}`;
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessageId 
            ? { 
                ...m,
                deepResearchStepInfo: {
                  ...m.deepResearchStepInfo,
                  [synthesisId]: {
                    title: 'Synthesis Analysis',
                    content: synthesisResult.synthesis || 'Synthesis analysis result is empty.',
                    isComplete: true,
                    isSynthesis: true
                  }
                }
              }
            : m
        )
      );

      // Generate final answer (with timeout and retry)
      
      let finalAnswerResult: any = null;
      const finalAnswerMaxRetries = 3;
      let finalAnswerLastError: Error | null = null;
      
              for (let attempt = 1; attempt <= finalAnswerMaxRetries; attempt++) {
          try {
            const finalAnswerResponse = await fetchWithTimeout(`/api/deepresearch/final-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: originalQuery,
              modelId,
              analysisSteps: validResults.map(result => ({
                analysis: result.analysis || result.content || result,
                subQuestion: result.originalQuestion,
                index: result.index
              })),
              synthesis: synthesisResult.synthesis
            })
          }, 120000); // 120초 타임아웃 (최종 답변은 가장 오래 걸릴 수 있음)

          if (!finalAnswerResponse.ok) {
            const errorText = await finalAnswerResponse.text();
            throw new Error(`Final answer generation failed (${finalAnswerResponse.status}): ${errorText}`);
          }

          finalAnswerResult = await finalAnswerResponse.json();
          break; // Exit loop on success
        } catch (error) {
          finalAnswerLastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < finalAnswerMaxRetries) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            throw new Error(`Final answer generation failed after ${finalAnswerMaxRetries} attempts: ${finalAnswerLastError?.message || 'Unknown error'}`);
          }
        }
      }

      // Update message with final answer
      const finalAnswerId = `final_answer_${Date.now()}`;
      const finalAnswerContent = finalAnswerResult.finalAnswer || finalAnswerResult.answer || 'Final answer was not generated.';
      
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessageId 
            ? { 
                ...m,
                // Replace content with final answer for llm-response display
                content: finalAnswerContent,
                isDeepResearchComplete: true,
                deepResearchStepType: 'final' as const, // Set as final answer step
                deepResearchStepInfo: {
                  ...m.deepResearchStepInfo,
                  [finalAnswerId]: {
                    title: 'Final Answer',
                    content: '', // Empty content for Final Answer block
                    isComplete: true,
                    isFinalAnswer: true
                  }
                }
              }
            : m
        )
      );


      
      // Save final answer to database
      try {
        // Use chatId from component props or providedChatId as fallback
        const chatIdToUse = chatId || providedChatId;
        if (!chatIdToUse) {
          throw new Error('Chat ID is missing or invalid');
        }
        
        const saveResponse = await fetch(`/api/chat/${chatIdToUse}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isFinalAnswer: true,
            message: finalAnswerContent,
            modelId: modelId
          })
        });
        
        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save final answer: ${errorText}`);
        }
      } catch (error) {
        console.error('Failed to save final answer to database:', error);
      }

      // Immediately end streaming state
      setIsStreaming(false);
      setStreamingMessageId(null);
      setIsSubmitting(false); // Reset submission state
      isSubmittingRef.current = false; // Ref도 함께 리셋
      streamingInProgress.current = false;
      
      // Additional safety measure - multiple attempts
      setTimeout(() => {
        setIsStreaming(false);
        setStreamingMessageId(null);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        streamingInProgress.current = false;
      }, 100);
      
      setTimeout(() => {
        setIsStreaming(false);
        setStreamingMessageId(null);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        streamingInProgress.current = false;
      }, 1000);

      // Deep research completed successfully
      
    } catch (error) {
      console.error('Parallel deep research error:', error);
      
      // Error handling
      const errorContent = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessageId 
            ? { 
                ...m,
                content: m.content + '\n\n⚠️ Error occurred during parallel deep research: ' + errorContent,
                hasDeepResearchError: true
              }
            : m
        )
      );
      
      // Clean up on error
      
      // Immediately end streaming state (on error)
      setIsStreaming(false);
      setStreamingMessageId(null);
      setIsSubmitting(false); // Reset submission state
      isSubmittingRef.current = false; // Ref도 함께 리셋
      streamingInProgress.current = false;
      
      // Additional safety measure
      setTimeout(() => {
        setIsStreaming(false);
        setStreamingMessageId(null);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        streamingInProgress.current = false;
      }, 100);
    } finally {
      // Clean up - remove from in-progress set
      deepResearchInProgress.current.delete(assistantMessageId);
    }
  };

  const sendMessageToAI = async (message: string, agentInfo: {id: string, type: string}, isRegeneration: boolean = false, images?: File[]) => {
    
    // Check URL parameters and localStorage for deep research state (to handle timing issues)
    const urlParams = new URLSearchParams(window.location.search)
    const urlDeepResearch = urlParams.get('deepResearch') === 'true'
    const urlGlobe = urlParams.get('globe') === 'true'
    
    // Also check localStorage for deep research and globe state
    const localDeepResearch = chatId ? localStorage.getItem(`chat_${chatId}_deepResearch`) === 'true' : false
    const localGlobe = chatId ? localStorage.getItem(`chat_${chatId}_globe`) === 'true' : false
    
    // Use URL parameters first, then localStorage, then React state as fallback
    const finalDeepResearch = urlDeepResearch || localDeepResearch || isDeepResearchActive
    const finalGlobe = urlGlobe || localGlobe || isGlobeActive
    
    if (!session?.user?.email) {
      return
    }

    // Abort if already streaming and start new request
    if (streamingInProgress.current) {
      handleAbort()
      // Wait briefly after message update
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Enhanced duplicate prevention using message content + timestamp + deep research state
    const currentTime = Date.now()
    const messageKey = `${message}_${images?.length || 0}_${isRegeneration}_${finalDeepResearch}`
    const lastMessageData = sessionStorage.getItem(`lastMessage_${chatId}`)
    
    if (lastMessageData) {
      try {
        const { message: lastMsg, timestamp: lastTime } = JSON.parse(lastMessageData)
        // Block if same message within 3 seconds (increased for deep research)
        if (lastMsg === messageKey && currentTime - lastTime < 3000) {
          return
        }
      } catch (e) {
        // If parsing fails, continue with old logic
        if (lastMessageData === messageKey) {
          return
        }
      }
    }
    
    sessionStorage.setItem(`lastMessage_${chatId}`, JSON.stringify({
      message: messageKey,
      timestamp: currentTime
    }))

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    streamingInProgress.current = true
    setIsStreaming(true)
    
    // Adjust padding and scroll
    adjustDynamicPadding()
    scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom

    try {
      let response: Response

      if (images && images.length > 0) {
        // Use FormData when images are present
        const formData = new FormData()
        formData.append('message', message)
        if (agentInfo.type === 'agent') {
          formData.append('agentId', agentInfo.id)
        } else {
          formData.append('modelId', agentInfo.id)
        }
        formData.append('modelType', agentInfo.type)
        formData.append('isRegeneration', isRegeneration.toString())
        formData.append('isDeepResearchActive', finalDeepResearch.toString())
        formData.append('isGlobeActive', finalGlobe.toString())
        
        // Add image files
        images.forEach((image) => {
          formData.append('images', image)
        })
        
        // Add userId for authentication
        formData.append('userId', session?.user?.email || '')
        
        response = await fetch(`/api/chat/${chatId}`, {
          method: 'POST',
          body: formData
        })
      } else {
        // Use JSON for text-only messages
        response = await fetch(`/api/chat/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            agentId: agentInfo.type === 'agent' ? agentInfo.id : undefined,
            modelId: agentInfo.type === 'model' ? agentInfo.id : undefined,
            modelType: agentInfo.type,
            isRegeneration,
            isDeepResearchActive: finalDeepResearch,
            isGlobeActive: finalGlobe,
            userId: session?.user?.email
          })
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        
        // Parse error message from response
        let errorMessage = 'Message sending failed'
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (e) {
          // If parsing fails, use the raw error text
          errorMessage = errorText || `HTTP ${response.status} Error`
        }
        
        throw new Error(errorMessage)
      }

      // Process streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let assistantContent = ''
        let assistantMessageId = ''
        let storedChatId: string | number | undefined = undefined
        let storedDeepResearchData: any = null // Deep research data 저장용

        const processStream = async () => {
          try {
            while (true) {
              if (abortController.signal.aborted) {
                break
              }

              const { done, value } = await reader.read()
              if (done) {
                break
              }

              const chunk = decoder.decode(value)
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    

                    
                    if (data.error) {
                      console.error('AI response error:', data.error)
                      break
                    }

                    if (data.messageId && !assistantMessageId) {
                      assistantMessageId = data.messageId
                      setStreamingMessageId(assistantMessageId)
                      // Add new message ID
                      setNewMessageIds(prev => new Set([...prev, assistantMessageId]))
                      // Initialize AI response message
                      setMessages(prev => [...prev, {
                        id: assistantMessageId,
                        role: "assistant" as const,
                        content: '',
                        timestamp: new Date(),
                      }])
                      // Only scroll when user hasn't scrolled manually when creating new AI response message
                      const container = messagesContainerRef.current
                      const userScrolled = (container as any)?.userScrolled?.() || false
                      
                      if (!userScrolled) {
                        adjustDynamicPadding()
                        scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom
                      }
                    }

                    if (data.content) {
                      assistantContent += data.content
                      // Real-time update of AI response
                      setMessages(prev => 
                        prev.map(m => 
                          m.id === assistantMessageId 
                            ? { ...m, content: assistantContent }
                            : m
                        )
                      )
                      // During streaming, only adjust padding and scroll when user hasn't scrolled manually
                      if (assistantContent.length % 100 === 0) {
                        const container = messagesContainerRef.current
                        const userScrolled = (container as any)?.userScrolled?.() || false
                        
                        if (!userScrolled) {
                          adjustDynamicPadding()
                          scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom
                        }
                      }
                    }

                    // Handle parallel processing started signal (처리 순서 변경)
                    if (data.parallelProcessingStarted && data.chatId) {
                      console.log('🚀 Parallel Processing Started Signal Received:', {
                        chatId: data.chatId,
                        hasStoredData: !!storedDeepResearchData,
                        storedDataSubQuestions: storedDeepResearchData?.stepInfo?.subQuestions?.length || 0
                      });
                      
                      // Store chatId for later use in parallel processing
                      storedChatId = data.chatId; // chatId를 저장 (dbMessageId 대신)
                      
                      // Start parallel processing if stored Deep Research data exists
                      if (storedDeepResearchData && storedDeepResearchData.stepInfo?.useParallelProcessing && storedDeepResearchData.stepInfo?.subQuestions) {
                        console.log('🎯 Starting Parallel Processing from Stored Data:', {
                          subQuestionsCount: storedDeepResearchData.stepInfo.subQuestions.length,
                          originalQuery: storedDeepResearchData.stepInfo.originalQuery,
                          modelId: storedDeepResearchData.stepInfo.modelId,
                          assistantMessageId,
                          storedChatId
                        });
                        
                        // Sub-questions를 메시지 내용으로 저장
                        assistantContent += storedDeepResearchData.content;
                        
                        // Start parallel processing
                        handleParallelDeepResearch(
                          storedDeepResearchData.stepInfo.subQuestions,
                          storedDeepResearchData.stepInfo.originalQuery,
                          storedDeepResearchData.stepInfo.modelId,
                          assistantMessageId,
                          storedChatId
                        );
                        
                        // Reset stored data
                        storedDeepResearchData = null;
                      }
                    }

                    // Handle Deep Research streaming
                    if (data.deepResearchStream) {
                      console.log('🔍 Deep Research Stream Data:', {
                        stepType: data.stepType,
                        stepInfo: data.stepInfo,
                        hasSubQuestions: !!data.stepInfo?.subQuestions,
                        useParallelProcessing: data.stepInfo?.useParallelProcessing,
                        subQuestionsCount: data.stepInfo?.subQuestions?.length || 0,
                        content: data.content?.substring(0, 100)
                      });
                      
                      // Handle planned steps
                      if (data.stepInfo && data.stepInfo.plannedSteps) {
                        setDeepResearchPlannedSteps(data.stepInfo.plannedSteps)
                        
                        // Create initial step structure when planned steps are received
                        const initialStepInfo: { [key: string]: any } = {};
                        
                        // Create initial step for sub-questions
                        if (data.stepInfo.subQuestions) {
                          data.stepInfo.subQuestions.forEach((question: string, index: number) => {
                            const stepKey = `subq_${index}_init`;
                            initialStepInfo[stepKey] = {
                              title: `Analysis: ${question}`,
                              content: '',
                              isComplete: false,
                              index: index,
                              subQuestionId: question,
                              originalQuestion: question
                            };
                          });
                        }
                        
                        // Set initial step structure in message
                        setMessages(prev => 
                          prev.map(m => 
                            m.id === assistantMessageId 
                              ? { 
                                  ...m,
                                  deepResearchStepInfo: {
                                    ...m.deepResearchStepInfo,
                                    ...initialStepInfo,
                                    plannedSteps: data.stepInfo.plannedSteps
                                  }
                                }
                              : m
                          )
                        );
                      }
                      
                      // Store data for parallel processing
                      if (data.stepInfo?.useParallelProcessing && data.stepInfo?.subQuestions) {
                        storedDeepResearchData = data;
                      }
                      
                      // Check parallel processing mode
                      if (data.stepInfo?.useParallelProcessing && data.stepInfo?.subQuestions) {
                        console.log('🎯 Starting Parallel Processing Directly:', {
                          subQuestionsCount: data.stepInfo.subQuestions.length,
                          originalQuery: data.stepInfo.originalQuery,
                          modelId: data.stepInfo.modelId,
                          assistantMessageId,
                          storedChatId,
                          dataChatId: data.chatId
                        });
                        
                        // Store sub-questions in message content
                        assistantContent += data.content;
                        
                        // Start parallel processing (using stored Chat ID)
                        const finalChatId = storedChatId || data.chatId;
                        
                        handleParallelDeepResearch(
                          data.stepInfo.subQuestions,
                          data.stepInfo.originalQuery,
                          data.stepInfo.modelId,
                          assistantMessageId,
                          finalChatId
                        );
                      } else {
                        // 기존 순차 처리 로직
                        // 스탭별 처리: Sub-questions와 최종답변(final)을 메시지 내용으로 저장
                        if (data.stepType === 'final' || 
                            (data.stepType === 'step' && data.stepInfo?.title === 'Sub-questions Generated')) {
                          // Sub-questions와 최종답변은 메시지 내용으로 저장하고 스트리밍 표시
                          assistantContent += data.content
                        }
                        // 다른 분석 과정(step, synthesis)은 메시지 내용에 저장하지 않음 (딥리서치 컴포넌트에서만 표시)
                      }
                      
                      // Real-time update of AI response with deep research streaming
                      setMessages(prev => 
                        prev.map(m => 
                          m.id === assistantMessageId 
                            ? { 
                                ...m, 
                                content: assistantContent, 
                                isDeepResearch: true, 
                                deepResearchStepType: data.stepType,
                                deepResearchStepInfo: {
                                  ...data.stepInfo || {},
                                  plannedSteps: deepResearchPlannedSteps.length > 0 ? deepResearchPlannedSteps : data.stepInfo?.plannedSteps,
                                  currentStepContent: data.content,
                                  currentStepType: data.stepType
                                }
                              }
                            : m
                        )
                      )
                      // Only scroll when user hasn't scrolled manually during deep research streaming
                      const container = messagesContainerRef.current
                      const userScrolled = (container as any)?.userScrolled?.() || false
                      
                      if (!userScrolled) {
                        adjustDynamicPadding()
                        scrollToBottomSmooth(true)
                      }
                    }

                    // Handle Deep Research final result
                    if (data.deepResearchFinal) {
                      assistantContent = data.content // Replace completely with final result
                      setMessages(prev => 
                        prev.map(m => 
                          m.id === assistantMessageId 
                            ? { ...m, content: assistantContent, isDeepResearch: true, isDeepResearchComplete: true }
                            : m
                        )
                      )
                      const container = messagesContainerRef.current
                      const userScrolled = (container as any)?.userScrolled?.() || false
                      
                      if (!userScrolled) {
                        adjustDynamicPadding()
                        scrollToBottomSmooth(true)
                      }
                    }

                    // Handle Deep Research error
                    if (data.deepResearchError) {
                      assistantContent += data.content
                      setMessages(prev => 
                        prev.map(m => 
                          m.id === assistantMessageId 
                            ? { ...m, content: assistantContent, isDeepResearch: true, hasDeepResearchError: true }
                            : m
                        )
                      )
                      const container = messagesContainerRef.current
                      const userScrolled = (container as any)?.userScrolled?.() || false
                      
                      if (!userScrolled) {
                        adjustDynamicPadding()
                        scrollToBottomSmooth(true)
                      }
                    }

                    if (data.titleGenerated) {
                      // Title has been generated, immediately refresh sidebar
                      const eventDetail = { chatId: data.chatId, title: data.title }
                      window.dispatchEvent(new CustomEvent('chatTitleUpdated', { 
                        detail: eventDetail
                      }))
                    }

                    if (data.done) {
                      console.log('=== Streaming completed (data.done=true) ===')
                      
                      // Immediately reset states on streaming completion
                      console.log('=== Immediate state reset on streaming completion ===')
                      setIsStreaming(false)
                      setIsSubmitting(false)
                      isSubmittingRef.current = false
                      setRegeneratingMessageId(null)
                      setStreamingMessageId(null)
                      streamingInProgress.current = false
                      
                      break
                    }
                  } catch (e) {
                    // Ignore JSON parsing errors
                  }
                }
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              // Stream processing aborted
            } else {
              console.error('Stream processing error:', error)
            }
          }
        }

        await processStream()
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // AI message sending aborted
      } else {
        console.error('AI message sending error:', error)
        // Show error toast to user
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        toast.error(errorMessage)
        
        // Reset regenerating state due to error
        setRegeneratingMessageId(null)
      }
    } finally {
      // Immediately reset states
      streamingInProgress.current = false
      setIsStreaming(false)
      setIsSubmitting(false)
      isSubmittingRef.current = false
      setRegeneratingMessageId(null)
      setStreamingMessageId(null)
      abortControllerRef.current = null
      
      // Reset states multiple times to ensure proper application
      setTimeout(() => {
        setRegeneratingMessageId(null)
        setIsStreaming(false)
        setIsSubmitting(false)
        isSubmittingRef.current = false
      }, 100)
      
      setTimeout(() => {
        setRegeneratingMessageId(null)
        setIsSubmitting(false)
        isSubmittingRef.current = false
        setIsStreaming(false)
      }, 500)
      
      setTimeout(() => {
        setRegeneratingMessageId(null)
        setIsStreaming(false)
        setIsSubmitting(false)
        isSubmittingRef.current = false
      }, 1000)
      
      // Prevent forced scroll after streaming completion if user manually scrolled
      const container = messagesContainerRef.current
      const userScrolled = (container as any)?.userScrolled?.() || false
      
      if (!userScrolled) {
        // Adjust final padding and scroll only if user didn't manually scroll
        adjustDynamicPadding()
        scrollToBottomSmooth(true) // Force scroll

        // Add one more scroll after streaming completion (wait for DOM update)
        setTimeout(() => {
          if (!(container as any)?.userScrolled?.()) {
            scrollToBottomSmooth()
          }
        }, 100)
      }
      
      // Restore base padding (increased delay)
      setTimeout(() => {
        setDynamicPadding(isMobile ? 320 : 160)
      }, 3000) // Restore after 3 seconds to minimize user scroll interference
      
      // Clear duplicate prevention after request completes
      setTimeout(() => {
        sessionStorage.removeItem(`lastMessage_${chatId}`)
      }, 3000) // Clear after 3 seconds
    }
  }

  // Load chat history when chatId or session changes
  useEffect(() => {
    let isCancelled = false
    
    // Initialize loading state
    setHistoryLoaded(false)
    setShowSkeleton(true)
    
    // Ensure minimum skeleton UI display time (300ms)
    const minSkeletonDisplayTime = 300
    const skeletonStartTime = Date.now()
    
    if (chatId && session?.user?.email) {
      // Get chat history from API
      const loadChatHistory = async () => {
        if (isCancelled) return

        try {
          const response = await fetch(`/api/chat/${chatId}`)
          if (isCancelled) return
          
          if (response.status === 401 || response.status === 404) {
            // Redirect to homepage if authentication error or resource not found
            toast.error('Chat session not found. Redirecting to home.')
            router.push('/')
            return
          }
          
          if (response.ok) {
            const data = await response.json()
            if (isCancelled) return
            
            // Convert timestamp to Date object and process rating info
            const messagesWithDateTimestamp = (data.messages || []).map((msg: any) => {
              // Handle timestamp conversion properly for SQLite (integer) and PostgreSQL (string)
              let timestamp: Date;
              if (msg.timestamp) {
                // If timestamp is a number (SQLite), it's already in milliseconds
                // If timestamp is a string (PostgreSQL), Date constructor can handle it
                timestamp = new Date(msg.timestamp);
                // Check if the date is valid
                if (isNaN(timestamp.getTime())) {
                  // If invalid, use current time as fallback
                  timestamp = new Date();
                }
              } else {
                // If no timestamp, use current time
                timestamp = new Date();
              }
              
              return {
                ...msg,
                timestamp
              };
            })
            
            // Load rating information from messages
            const likedMessageIds = new Set<string>()
            const dislikedMessageIds = new Set<string>()
            
            messagesWithDateTimestamp.forEach((msg: any) => {
              if (msg.rating === 1) {
                likedMessageIds.add(msg.id)
              } else if (msg.rating === -1) {
                dislikedMessageIds.add(msg.id)
              }
            })
            
            // Update rating states
            setLikedMessages(likedMessageIds)
            setDislikedMessages(dislikedMessageIds)
            
            // Process messages in a non-blocking way
            const processMessages = () => {
              return new Promise<void>((resolve) => {
                if (isCancelled) {
                  resolve()
                  return
                }
                
                // Process messages consistently regardless of count
                // Set messages directly instead of initializing with empty array
                setMessages(messagesWithDateTimestamp)
                
                // Auto-generate AI response if last message is user message AND there's agent info in localStorage
                // This only happens for newly created chats where user message was just sent
                const agentInfo = localStorage.getItem(`chat_${chatId}_agent`)
                if (messagesWithDateTimestamp.length > 0 && !streamingInProgress.current && agentInfo) {
                  const lastMessage = messagesWithDateTimestamp[messagesWithDateTimestamp.length - 1]
                  
                  // Only generate response if:
                  // 1. Last message is from user
                  // 2. There's exactly 1 message (first conversation)
                  // 3. Agent info exists in localStorage
                                    if (lastMessage.role === 'user' && messagesWithDateTimestamp.length === 1) {
                    if (!isCancelled) {
                      const parsedAgentInfo = JSON.parse(agentInfo)
                      
                      // Check URL parameters and localStorage for deep research state (to avoid React state timing issues)
                      const urlParams = new URLSearchParams(window.location.search)
                      const urlDeepResearch = urlParams.get('deepResearch') === 'true'
                      const urlGlobe = urlParams.get('globe') === 'true'
                      
                      // Also check localStorage for deep research and globe state
                      const localDeepResearch = chatId ? localStorage.getItem(`chat_${chatId}_deepResearch`) === 'true' : false
                      const localGlobe = chatId ? localStorage.getItem(`chat_${chatId}_globe`) === 'true' : false
                      
                      // Use URL parameters first, then localStorage, then React state as fallback
                      const finalDeepResearch = urlDeepResearch || localDeepResearch || isDeepResearchActive
                      const finalGlobe = urlGlobe || localGlobe || isGlobeActive
                      
                      // Temporarily update React state if URL params or localStorage indicate different values
                      if ((urlDeepResearch || localDeepResearch) && !isDeepResearchActive) {
                        setIsDeepResearchActive(true)
                      }
                      if ((urlGlobe || localGlobe) && !isGlobeActive) {
                        setIsGlobeActive(true)
                      }
                      
                      // Extract images from user message if present and call streaming API
                      const processImagesAndSendMessage = async () => {
                        let messageContent = lastMessage.content
                        let imagesToSend: File[] = []
                        
                        try {
                          // Check if message contains JSON with images
                          const parsed = JSON.parse(lastMessage.content)
                          if (parsed.hasImages && parsed.images && Array.isArray(parsed.images)) {
                            messageContent = parsed.text || ''
                            
                            // Convert base64 data back to File objects
                            imagesToSend = await Promise.all(
                              parsed.images.map(async (imageInfo: any) => {
                                if (imageInfo.data) {
                                  // Convert base64 data URL to Blob then to File
                                  const response = await fetch(imageInfo.data)
                                  const blob = await response.blob()
                                  return new File([blob], imageInfo.name || 'image.png', { 
                                    type: imageInfo.mimeType || 'image/png' 
                                  })
                                }
                                return null
                              })
                            ).then(files => files.filter(file => file !== null) as File[])
                            

                          }
                        } catch (e) {
                          // If JSON parsing fails, treat as plain text
                          messageContent = lastMessage.content
                        }
                        
                        // Call streaming API with isRegeneration=true to prevent duplicate user message saving
                        sendMessageToAI(messageContent, parsedAgentInfo, true, imagesToSend)
                      }
                      
                      // Execute the async function
                      processImagesAndSendMessage()
                      
                      // Clean up localStorage after use (delay to prevent race condition)
                      setTimeout(() => {
                        localStorage.removeItem(`chat_${chatId}_agent`)
                        localStorage.removeItem(`chat_${chatId}_deepResearch`)
                        localStorage.removeItem(`chat_${chatId}_globe`)
                      }, 1000)
                    }
                  } else {
                    // Clean up localStorage if it exists but we're not using it
                    localStorage.removeItem(`chat_${chatId}_agent`)
                  }
                }
                
                // Always resolve the promise
                resolve()
              })
            }
            
            // Process messages asynchronously
            await processMessages()
          } else {
            console.error('Failed to load chat history')
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('Chat history load error:', error)
          }
        } finally {
          if (!isCancelled) {
            // Ensure minimum skeleton UI display time (300ms)
            const elapsedTime = Date.now() - skeletonStartTime
            const remainingTime = Math.max(0, minSkeletonDisplayTime - elapsedTime)
            
            setTimeout(() => {
              if (!isCancelled) {
                // Prevent render blocking when there are many messages
                requestAnimationFrame(() => {
                  setHistoryLoaded(true) // Mark history load as completed
                  setShowSkeleton(false) // Hide skeleton UI
                  
                  // Move to bottom immediately after content is loaded (without animation)                  
                  // Final scroll processing
                  setTimeout(() => {
                    scrollToBottomInstant()
                  }, 600)
                })
              }
            }, remainingTime)
          }
        }
      }

      loadChatHistory()
    } else {
      // If chatId or session is missing, handle loading completion after minimum time
      const elapsedTime = Date.now() - skeletonStartTime
      const remainingTime = Math.max(0, minSkeletonDisplayTime - elapsedTime)
      
      setTimeout(() => {
        if (!isCancelled) {
          requestAnimationFrame(() => {
            setHistoryLoaded(true)
            setShowSkeleton(false)
          })
        }
      }, remainingTime)
    }

    // Cleanup function
    return () => {
      isCancelled = true
    }
  }, [chatId, session?.user?.email, isMobile])

  // Auto-send first message logic is handled in loadChatHistory useEffect above
  // This useEffect was causing duplicate message generation and has been removed

  // Handle session status changes
  useEffect(() => {
    // Reset history load state when session changes
    if (!session?.user?.email) {
      setHistoryLoaded(false)
      setShowSkeleton(false)
      setMessages([])
    }
  }, [session?.user?.email])

  // Handle scroll on message change (also works when chat ID changes)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    if (messages.length > 0) {
      // Check if user manually scrolled
      const container = messagesContainerRef.current
      const userScrolled = (container as any)?.userScrolled?.() || false
      
      if (isInitialLoad) {
        // On initial load, scroll to bottom regardless of user scroll state
        setTimeout(() => scrollToBottomInstant(), 100)
        setTimeout(() => scrollToBottomInstant(), 300)
        setTimeout(() => scrollToBottomInstant(), 600)
        setIsInitialLoad(false)
      } else if (!userScrolled || isStreaming) {
        // Scroll only if user didn't scroll or streaming is in progress
        setTimeout(() => scrollToBottomSmooth(true), 100)
        // If not streaming, minimize additional scroll
        if (isStreaming) {
          setTimeout(() => scrollToBottomInstant(), 300)
          setTimeout(() => scrollToBottomInstant(), 600)
        }
      }
      
      // Adjust padding regardless of user scroll state
      setTimeout(() => adjustDynamicPadding(), 200)
      
      // Clean up new message IDs after animation completes
      setTimeout(() => {
        setNewMessageIds(new Set())
      }, 1000)
    }
  }, [messages, isInitialLoad, adjustDynamicPadding, isStreaming])
  
  // Reset to initial load state when chatId changes
  useEffect(() => {
    setIsInitialLoad(true)
    const basePadding = isMobile !== undefined ? (isMobile ? 320 : 160) : 240
    setDynamicPadding(basePadding) // Reset padding too
  }, [chatId, isMobile])

  // Check if selected model supports multimodal input
  const supportsMultimodal = useMemo(() => {
    if (!selectedModel) return false
    
    if (selectedModel.type === 'agent') {
      // For agents, check both agent's supportsMultimodal and underlying model's supportsMultimodal
      const agentSupports = selectedModel.supportsMultimodal === true || selectedModel.supportsMultimodal === 1
      const modelSupports = selectedModel.modelSupportsMultimodal === true || selectedModel.modelSupportsMultimodal === 1
      return agentSupports || modelSupports
    } else if (selectedModel.type === 'model') {
      // For public models, check supportsMultimodal field
      return selectedModel.supportsMultimodal === true || selectedModel.supportsMultimodal === 1
    }
    
    return false
  }, [selectedModel])

  // Add scroll event listener - prevent auto scroll when user scrolls
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout | null = null
    let userScrolled = false

    const handleScroll = () => {
      // Optimize scroll event debouncing for performance
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      scrollTimeout = setTimeout(() => {
        // Check if user manually scrolled
        if (!isScrollingToBottom.current) {
          const { scrollTop, scrollHeight, clientHeight } = container
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 80
          
          // Set userScrolled flag if user scrolled up
          if (!isAtBottom) {
            userScrolled = true
            // Ensure rendering stability when scrolling up
            container.style.contentVisibility = 'auto'
          } else {
            // Reset userScrolled flag if user scrolled back to bottom
            userScrolled = false
          }
        }
      }, 16) // Debounce for 60fps
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // Save userScrolled state to container for other functions to access
    ;(container as any).userScrolled = () => userScrolled
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [])

  // Use ResizeObserver to detect content size changes and auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Don't auto-scroll if user has manually scrolled up
        const userScrolled = (container as any).userScrolled?.() || false
        if (userScrolled && !isStreaming) {
          // Prevent auto-scroll if not streaming and user has scrolled
          return
        }
        
        // Auto-scroll if user is near bottom when content size changes
        const { scrollTop, scrollHeight, clientHeight } = container
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
        
        if (isNearBottom && !isScrollingToBottom.current) {
          // Short delay before scrolling (wait for DOM updates)
          setTimeout(() => {
            scrollToBottomInstant()
          }, 50)
        }
      }
    })

    // Observe message container
    resizeObserver.observe(container)
    
    // Also observe inner content container
    const innerContainer = container.querySelector('.max-w-full')
    if (innerContainer) {
      resizeObserver.observe(innerContainer)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [isStreaming])

  // Clean up streaming on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      streamingInProgress.current = false
      setIsStreaming(false)
    }
  }, [])

  // Move to bottom immediately without animation
  const scrollToBottomInstant = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      isScrollingToBottom.current = true
      
      // Multiple attempts to ensure proper scrolling to bottom
      const scrollToMax = () => {
        // Recalculate scroll height for latest value
        const maxScrollTop = container.scrollHeight - container.clientHeight
        container.scrollTop = Math.max(0, maxScrollTop)
        lastScrollHeight.current = container.scrollHeight
      }
      
      // Immediately scroll
      scrollToMax()      
    }
  }

  // Move to bottom smoothly with animation
  const scrollToBottomSmooth = (force: boolean = false) => {
    if (messagesContainerRef.current && !isScrollingToBottom.current) {
      const container = messagesContainerRef.current
      const newScrollHeight = container.scrollHeight
      
      // Don't scroll if scroll height hasn't changed (ignore if force is true)
      if (!force && newScrollHeight <= lastScrollHeight.current + 10) {
        return
      }
      
      isScrollingToBottom.current = true
      lastScrollHeight.current = newScrollHeight
      
      // 실제 최대 스크롤 위치 계산
      const maxScrollTop = Math.max(0, newScrollHeight - container.clientHeight)
      
      // 부드럽게 스크롤
      container.scrollTo({
        top: maxScrollTop,
        behavior: 'smooth'
      })
      
      // 스크롤 완료 후 여러 번 확인
      setTimeout(() => {
        const currentMaxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        if (container.scrollTop < currentMaxScrollTop - 20) {
          container.scrollTop = currentMaxScrollTop
        }
        
        // 한 번 더 확인
        setTimeout(() => {
          const finalMaxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
          if (container.scrollTop < finalMaxScrollTop - 20) {
            container.scrollTop = finalMaxScrollTop
          }
          isScrollingToBottom.current = false
        }, 300)
      }, 600) // 애니메이션 완료 대기
    }
  }

  const adjustHeight = () => {
    // Use fixed height
  }

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    
    // Automatically adjust textarea height
    const target = e.target as HTMLTextAreaElement
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, window.innerHeight * 0.3) + 'px'
  }, [])

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
  }, [])

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false)
  }, [])

  const handleCopyMessage = useCallback((content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    // 2초 후 복사 상태 초기화
    setTimeout(() => {
      setCopiedMessageId(null)
    }, 2000)
  }, [])

  const handleLikeMessage = useCallback(async (messageId: string) => {
    const isCurrentlyLiked = likedMessages.has(messageId)
    const newRating = isCurrentlyLiked ? 0 : 1
    
    // 낙관적 업데이트
    setLikedMessages((prev) => {
      const newSet = new Set(prev)
      if (isCurrentlyLiked) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
        // 좋아요 시 싫어요 제거
        setDislikedMessages((prevDisliked) => {
          const newDislikedSet = new Set(prevDisliked)
          newDislikedSet.delete(messageId)
          return newDislikedSet
        })
      }
      return newSet
    })

    // API 호출
    try {
      const response = await fetch(`/api/chat/${chatId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          rating: newRating
        })
      })

      if (response.status === 401 || response.status === 404) {
        // 인증 오류 또는 리소스 없음 시 홈페이지로 리다이렉트
        router.push('/')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update rating')
      }
    } catch (error) {
      console.error('Error updating like:', error)
      // Rollback on failure
      setLikedMessages((prev) => {
        const newSet = new Set(prev)
        if (isCurrentlyLiked) {
          newSet.add(messageId)
        } else {
          newSet.delete(messageId)
        }
        return newSet
      })
    }
  }, [chatId, likedMessages, router])

  const handleDislikeMessage = useCallback(async (messageId: string) => {
    const isCurrentlyDisliked = dislikedMessages.has(messageId)
    const newRating = isCurrentlyDisliked ? 0 : -1
    
          // Optimistic update
    setDislikedMessages((prev) => {
      const newSet = new Set(prev)
      if (isCurrentlyDisliked) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
        // Remove like when disliking
        setLikedMessages((prevLiked) => {
          const newLikedSet = new Set(prevLiked)
          newLikedSet.delete(messageId)
          return newLikedSet
        })
      }
      return newSet
    })

    // API 호출
    try {
      const response = await fetch(`/api/chat/${chatId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          rating: newRating
        })
      })

      if (response.status === 401 || response.status === 404) {
        // 인증 오류 또는 리소스 없음 시 홈페이지로 리다이렉트
        router.push('/')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update rating')
      }
    } catch (error) {
      console.error('Error updating dislike:', error)
      // Rollback on failure
      setDislikedMessages((prev) => {
        const newSet = new Set(prev)
        if (isCurrentlyDisliked) {
          newSet.add(messageId)
        } else {
          newSet.delete(messageId)
        }
        return newSet
      })
    }
  }, [chatId, dislikedMessages, router])

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
    setSelectedMessageId(null)
  }, [])

  const handleSaveEdit = (messageId: string) => {
    // Update message content
    const updatedMessages = messages.map((msg) => 
      msg.id === messageId ? { ...msg, content: editingContent } : msg
    )
    setMessages(updatedMessages)
    
    // Reset edit state
    setEditingMessageId(null)
    const savedContent = editingContent
    setEditingContent("")

    // If edited message is from user, delete all subsequent messages and regenerate
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    const editedMessage = messages[messageIndex]
    
    if (editedMessage && editedMessage.role === "user" && selectedModel && chatId && session?.user?.email) {
      // Stop streaming if in progress
      if (isStreaming) {
        handleAbort()
      }
      
      // 해당 사용자 메시지에 대해 재생성 상태 설정
      setRegeneratingMessageId(messageId)
      
      // 해당 사용자 메시지 이후의 모든 메시지 제거 (편집된 사용자 메시지는 유지)
      setTimeout(() => {
        setMessages(prev => prev.slice(0, messageIndex + 1))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 편집된 내용으로 AI 재생성
        setTimeout(() => {
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          sendMessageToAI(savedContent, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300)
      }, 100) // 메시지 업데이트 후 잠시 대기
    }
  }

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingContent("")
  }, [])

  const handleRegenerateResponse = (messageId: string) => {
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      handleAbort()
    }
    
    // 해당 AI 응답 메시지와 그 이후의 모든 메시지를 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex > 0 && selectedModel && chatId && session?.user?.email) {
      const previousUserMessage = messages[messageIndex - 1]
      if (previousUserMessage.role === "user") {
        // 해당 사용자 메시지에 대해 재생성 상태 설정
        setRegeneratingMessageId(previousUserMessage.id)
        
        // 해당 AI 응답 메시지부터 모든 메시지 제거 (사용자 메시지는 유지)
        setMessages(messages.slice(0, messageIndex))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 재생성을 위한 상태 초기화 및 AI 요청
        setTimeout(() => {
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          sendMessageToAI(previousUserMessage.content, {
            id: selectedModel.id,
            type: selectedModel.type
          }, true)
        }, 300) // 중단 처리 완료를 위해 짧은 지연
      }
    }
  }

  const handleRegenerateFromUserMessage = async (messageId: string) => {
    
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      handleAbort()
    }
    
    // 해당 사용자 메시지부터 하위 모든 메시지 제거하고 다시 생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex >= 0 && selectedModel && chatId && session?.user?.email) {
      const userMessage = messages[messageIndex]
      if (userMessage.role === "user") {
        // 해당 사용자 메시지에 대해 재생성 상태 설정
        setRegeneratingMessageId(messageId)
        
        // 사용자 메시지 다음부터의 모든 메시지가 있는지 확인
        const nextMessageIndex = messageIndex + 1
        if (nextMessageIndex < messages.length) {
          const nextMessage = messages[nextMessageIndex]
          
          try {
            
            // 데이터베이스에서 해당 메시지부터 이후 모든 메시지 삭제
            const response = await fetch(`/api/chat/${chatId}?userId=${session.user.email}&fromMessageId=${nextMessage.id}`, {
              method: 'DELETE'
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to delete messages from database: ${response.status} ${errorData.error || response.statusText}`);
            }
            
            const deleteResult = await response.json();
            
            if (deleteResult.success) {
              // 삭제 작업이 완료된 후 실제로 메시지가 삭제되었는지 검증
              if (deleteResult.deletedCount > 0) {
                
                // 잠시 후 채팅 기록을 다시 로드하여 삭제가 제대로 되었는지 확인
                setTimeout(async () => {
                  try {
                    const verifyResponse = await fetch(`/api/chat/${chatId}`);
                    if (verifyResponse.ok) {
                      const verifyData = await verifyResponse.json();
                      const currentMessages = verifyData.messages || [];
                      
                      // 삭제된 메시지가 여전히 존재하는지 확인
                      const deletedMessageStillExists = currentMessages.some((msg: any) => msg.id === nextMessage.id);
                      
                      if (deletedMessageStillExists) {
                        console.error('ERROR: Deleted message still exists in database!');
                      }
                    }
                  } catch (verifyError) {
                    console.error('Failed to verify deletion:', verifyError);
                  }
                }, 1000);
              }
            }
          } catch (error) {
            console.error('Error deleting messages from database:', error);
            
            // 데이터베이스 삭제 실패해도 UI에서는 진행
          }
        }
        
        // 해당 사용자 메시지 이후의 모든 메시지 제거 (사용자 메시지는 유지)
        setMessages(messages.slice(0, messageIndex + 1))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 재생성을 위한 상태 초기화 및 AI 요청
        setTimeout(async () => {
          
          // 중복 방지 로직 초기화
          streamingInProgress.current = false
          sessionStorage.removeItem(`lastMessage_${chatId}`)
          lastSubmittedMessage.current = null
          lastSubmittedTime.current = 0
          
          // 사용자 메시지에서 이미지 정보 추출
          let messageContent = userMessage.content
          let imagesToSend: File[] = []
          
          try {
            // JSON 형태로 저장된 메시지에서 이미지 정보 추출
            const parsed = JSON.parse(userMessage.content)
            if (parsed.hasImages && parsed.images && Array.isArray(parsed.images)) {
              messageContent = parsed.text || ''
              // Base64 데이터를 File 객체로 변환
              imagesToSend = await Promise.all(
                parsed.images.map(async (imageInfo: any) => {
                  if (imageInfo.data) {
                    // Base64 데이터를 Blob으로 변환
                    const response = await fetch(imageInfo.data)
                    const blob = await response.blob()
                    // Blob을 File 객체로 변환
                    return new File([blob], imageInfo.name || 'image.png', { 
                      type: imageInfo.mimeType || 'image/png' 
                    })
                  }
                  return null
                })
              ).then(files => files.filter(file => file !== null) as File[])
            }
          } catch (e) {
            // JSON 파싱 실패 시 텍스트로 처리
            messageContent = userMessage.content
          }
          
          try {
            await sendMessageToAI(messageContent, {
              id: selectedModel.id,
              type: selectedModel.type
            }, true, imagesToSend)
          } catch (error) {
            console.error('Error in sendMessageToAI during regeneration:', error)
            // 재생성 중 에러 발생 시 상태 리셋
            setRegeneratingMessageId(null)
            setIsStreaming(false)
            streamingInProgress.current = false
          }
        }, 300) // 중단 처리 완료를 위해 짧은 지연
      }
    }
  }

  const handleSubmit = useCallback(async () => {
    // 이미 전송 중인 경우 차단 (이중 체크)
    if (isSubmitting || isSubmittingRef.current) {
      return
    }
    
    // 중복 메시지 검사 (같은 메시지가 500ms 이내에 전송되는 경우)
    const currentTime = Date.now()
    const messageToCheck = inputValue.trim() || 'IMAGE_ONLY'
    
    if (lastSubmittedMessage.current === messageToCheck && 
        currentTime - lastSubmittedTime.current < 500) {
      return
    }
    
    // 빈 메시지 체크 (텍스트도 없고 이미지도 없는 경우)
    if (!inputValue.trim() && uploadedImages.length === 0) {
      return
    }
    
    // 전송 시작 플래그 설정
    isSubmittingRef.current = true
    
    // 스트리밍 중이면 먼저 중단
    if (isStreaming) {
      handleAbort()
    }
    
    if ((inputValue.trim() || uploadedImages.length > 0) && selectedModel && chatId && session?.user?.email) {
      try {
        // 전송 중 플래그 설정
        setIsSubmitting(true)
        
        // 새 메시지 전송 시 재생성 상태 리셋
        setRegeneratingMessageId(null)
        
        // 중복 방지 정보 업데이트
        lastSubmittedMessage.current = messageToCheck
        lastSubmittedTime.current = currentTime
      
      // 전송할 이미지와 메시지 콘텐츠 준비
      const imagesToSend = [...uploadedImages]
      const messageContent = inputValue
      
      // 사용자 메시지 콘텐츠 생성 (이미지 정보 포함)
      let userMessageContent = inputValue || ''
      
      // 이미지가 있는 경우 JSON 형태로 저장 (UserRequest에서 파싱하여 표시)
      if (imagesToSend.length > 0) {
        const imageInfos = await Promise.all(
          imagesToSend.map(async (image) => {
            // 사용자 메시지 표시를 위해 base64 데이터도 포함
            const reader = new FileReader()
            const base64 = await new Promise<string>((resolve) => {
              reader.onload = (e) => resolve(e.target?.result as string)
              reader.readAsDataURL(image)
            })
            
            return {
              type: 'image',
              name: image.name,
              size: image.size,
              mimeType: image.type,
              data: base64
            }
          })
        )
        
        userMessageContent = JSON.stringify({
          text: inputValue || '',
          images: imageInfos,
          hasImages: true
        })
      }

      // 메시지 추가 (이미지 정보 포함)
      const newUserMessage: Message = {
        id: generateUniqueId("user"),
        role: "user",
        content: userMessageContent,
        timestamp: new Date(),
      }

      // 새 메시지 ID 추가
      setNewMessageIds(prev => new Set([...prev, newUserMessage.id]))
      setMessages([...messages, newUserMessage])
      
      // 입력 상태 초기화
      setInputValue("")
      setUploadedImages([]) // 이미지 상태 초기화
      
      // ChatInput의 이미지도 초기화
      setClearImagesTrigger(prev => !prev)
      
      // 텍스트 입력창 강제 초기화 (한글 IME 조합 중인 글자 제거)
      // IME 조합 완료를 위해 약간의 지연 후 초기화
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.value = ""
          textareaRef.current.style.height = "auto"
          textareaRef.current.style.height = "52px"
          
          // React 상태와 동기화
          setInputValue("")
        }
      }, 0)
      
      // 메시지 추가 후 스크롤 (사용자가 수동으로 스크롤하지 않았을 때만)
      const container = messagesContainerRef.current
      const userScrolled = (container as any)?.userScrolled?.() || false
      
      if (!userScrolled) {
        scrollToBottomSmooth()
      }

      // 스트리밍이 중단되었다면 잠시 대기 후 새 메시지 전송
      const sendMessage = () => {
        sendMessageToAI(messageContent, {
          id: selectedModel.id,
          type: selectedModel.type
        }, false, imagesToSend).finally(() => {
          // 전송 완료 후 플래그 해제
          setIsSubmitting(false)
          isSubmittingRef.current = false
        })
      }
      
        if (isStreaming) {
          // 스트리밍 중단 처리 완료를 위해 짧은 지연 후 전송
          setTimeout(sendMessage, 100)
        } else {
          // 즉시 전송
          sendMessage()
        }
      } catch (error) {
        console.error('Error in handleSubmit:', error)
        // 에러 발생 시 플래그 해제
        setIsSubmitting(false)
        isSubmittingRef.current = false
      }
    }
  }, [inputValue, uploadedImages, messages, selectedModel, chatId, session?.user?.email, isStreaming, isSubmitting, generateUniqueId, scrollToBottomSmooth, sendMessageToAI, handleAbort])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
    }

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Allow line break with Shift + Enter (default behavior)
        return
      } else {
        // Submit on Enter only
        e.preventDefault()
        
        // Check if IME composition is in progress
        if (e.nativeEvent.isComposing || isComposing) {
          // Wait if composition is in progress
          return
        }
        
        // Execute immediately (removed setTimeout to prevent duplicate execution)
        handleSubmit()
      }
    }
  }, [handleSubmit, isComposing])

  // 메시지 렌더링을 조건부 렌더링 밖에서 정의하여 Hook 순서 유지
  const renderedMessages = useMemo(() => {
    
    return messages.map((message, index) => (
      <ChatMessageWrapper
        key={`${message.id}-${forceUpdateCounter}-${regeneratingMessageId || 'none'}`}
        message={message}
        isNewMessage={newMessageIds.has(message.id)}
        copiedMessageId={copiedMessageId}
        likedMessages={likedMessages}
        dislikedMessages={dislikedMessages}
        isStreaming={isStreaming}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        regeneratingMessageId={regeneratingMessageId}
        streamingMessageId={streamingMessageId}
        onCopy={handleCopyMessage}
        onLike={handleLikeMessage}
        onDislike={handleDislikeMessage}
        onRegenerate={handleRegenerateResponse}
        onEdit={handleEditMessage}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        onRegenerateFromUser={handleRegenerateFromUserMessage}
        setEditingContent={setEditingContent}
      />
    ))
  }, [messages, newMessageIds, copiedMessageId, likedMessages, dislikedMessages, isStreaming, editingMessageId, editingContent, regeneratingMessageId, streamingMessageId, forceUpdateCounter]
  )

  // 인증되지 않은 경우 리다이렉트
  if (sessionStatus === "unauthenticated") {
    router.push('/auth')
    return null
  }

  return (
    <>
      {/* 메시지 컨테이너 */}
      <div className="flex-1 flex flex-col px-3 sm:px-0 relative overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="messages-container flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 transition-all duration-200 ease-out mobile-scroll touch-scroll"
          style={{ 
            scrollBehavior: 'smooth',
            paddingBottom: `${dynamicPadding}px`,
            overflowAnchor: 'none'
          }}
        >
          <div className="sm:px-3 max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
            {(() => {
              
              if (!historyLoaded && showSkeleton) {
                return <ChatMessageSkeleton />
              } else if (!historyLoaded && !showSkeleton) {
                return <div></div>
              } else {
                return renderedMessages
              }
            })()}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* 입력 컨테이너 - 단 고정 */}
          <ChatInput
            inputValue={inputValue}
            textareaRef={textareaRef}
            isGlobeActive={isGlobeActive}
            isDeepResearchActive={isDeepResearchActive}
            isStreaming={isStreaming}
            isSubmitting={isSubmitting}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            handleKeyUp={handleKeyUp}
            handleCompositionStart={handleCompositionStart}
            handleCompositionEnd={handleCompositionEnd}
            handleSubmit={handleSubmit}
            handleAbort={handleAbort}
            setIsGlobeActive={setIsGlobeActive}
            setIsDeepResearchActive={setIsDeepResearchActive}
            onImageUpload={handleImageUpload}
            clearImages={clearImagesTrigger}
            supportsMultimodal={supportsMultimodal}
            selectedAgent={selectedModel?.type === 'agent' ? selectedModel : null}
          />
      </div>
    </>
  )
}
