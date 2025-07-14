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

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isDeepResearch?: boolean
  deepResearchStepType?: 'step' | 'synthesis' | 'final'
  isDeepResearchComplete?: boolean
  hasDeepResearchError?: boolean
  deepResearchStepInfo?: Record<string, any>
}

interface ChatPageProps {
  chatId?: string
}

// Memoized message wrapper component
const MessageWrapper = memo(({ 
  message, 
  isNewMessage, 
  copiedMessageId, 
  likedMessages, 
  dislikedMessages, 
  isStreaming, 
  editingMessageId, 
  editingContent, 
  regeneratingMessageId,
  streamingMessageId,
  onCopy, 
  onLike, 
  onDislike, 
  onRegenerate, 
  onEdit, 
  onSave, 
  onCancel, 
  onRegenerateFromUser, 
  setEditingContent 
}: {
  message: Message
  isNewMessage: boolean
  copiedMessageId: string | null
  likedMessages: Set<string>
  dislikedMessages: Set<string>
  isStreaming: boolean
  editingMessageId: string | null
  editingContent: string
  regeneratingMessageId: string | null
  streamingMessageId: string | null
  onCopy: (content: string, messageId: string) => void
  onLike: (messageId: string) => void
  onDislike: (messageId: string) => void
  onRegenerate: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onSave: (messageId: string) => void
  onCancel: () => void
  onRegenerateFromUser: (messageId: string) => void
  setEditingContent: (content: string) => void
}) => {
  return (
    <div 
      className={`message-item mb-6 ${isNewMessage ? 'message-enter' : ''} ${message.role === "user" ? "flex justify-end" : ""}`}
    >
      {message.role === "assistant" && (
        <LlmResponse
          id={message.id}
          content={message.content}
          timestamp={message.timestamp}
          onCopy={onCopy}
          onLike={onLike}
          onDislike={onDislike}
          onRegenerate={onRegenerate}
          copiedMessageId={copiedMessageId}
          likedMessages={likedMessages}
          dislikedMessages={dislikedMessages}
          isStreaming={isStreaming && streamingMessageId === message.id}
          isDeepResearch={message.isDeepResearch}
          deepResearchStepType={message.deepResearchStepType}
          isDeepResearchComplete={message.isDeepResearchComplete}
          hasDeepResearchError={message.hasDeepResearchError}
          deepResearchStepInfo={message.deepResearchStepInfo}
        />
      )}

      {message.role === "user" && (
        <UserRequest
          id={message.id}
          content={message.content}
          timestamp={message.timestamp}
          onCopy={onCopy}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          onRegenerate={onRegenerateFromUser}
          editingMessageId={editingMessageId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          copiedMessageId={copiedMessageId}
          isStreaming={isStreaming}
          regeneratingMessageId={regeneratingMessageId}
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Only rerender if message content hasn't changed and only state related to this message has changed
  const message = prevProps.message
  const nextMessage = nextProps.message
  
  // Message content has changed, rerender
  if (message.id !== nextMessage.id || message.content !== nextMessage.content) {
    return false
  }
  
  // Current message is streaming, rerender
  if (nextProps.streamingMessageId === message.id) {
    return false
  }
  
  // Current message is being edited, rerender
  if (nextProps.editingMessageId === message.id) {
    return false
  }
  
  // Current message is being regenerated or regeneration state changed, rerender
  if (nextProps.regeneratingMessageId === message.id || 
      prevProps.regeneratingMessageId === message.id) {
    return false
  }
  
  // Current message has been copied, rerender
  if (nextProps.copiedMessageId === message.id) {
    return false
  }
  
  // Current message is new, rerender
  if (nextProps.isNewMessage !== prevProps.isNewMessage) {
    return false
  }
  
  // Like/dislike state has changed, rerender
  if (nextProps.likedMessages.has(message.id) !== prevProps.likedMessages.has(message.id) ||
      nextProps.dislikedMessages.has(message.id) !== prevProps.dislikedMessages.has(message.id)) {
    return false
  }
  
  // Don't rerender in other cases
  return true
})

// Chat message skeleton component
const ChatMessageSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* First AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse"></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '0.1s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="h-4 w-[95%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.3s'}}></div>
            <div className="h-4 w-[85%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.4s'}}></div>
            <div className="h-4 w-[92%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="h-4 w-[78%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.6s'}}></div>
          </div>
        </div>
      </div>

      {/* Second AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse" style={{animationDelay: '0.7s'}}></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '0.8s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-[90%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.9s'}}></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.0s'}}></div>
            <div className="h-4 w-[87%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.1s'}}></div>
            <div className="h-4 w-[65%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.2s'}}></div>
          </div>
        </div>
      </div>

      {/* Third AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse" style={{animationDelay: '1.3s'}}></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '1.4s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-[82%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.5s'}}></div>
            <div className="h-4 w-[96%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.6s'}}></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.7s'}}></div>
            <div className="h-4 w-[89%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.8s'}}></div>
            <div className="h-4 w-[75%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.9s'}}></div>
            <div className="h-4 w-[91%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '2.0s'}}></div>
            <div className="h-4 w-[68%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '2.1s'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  
  // Debug: 재생성 상태 변경 전역 추적
  useEffect(() => {
    console.log('=== Global regeneratingMessageId changed ===')
    console.log('New regeneratingMessageId:', regeneratingMessageId)
    console.log('Current isStreaming:', isStreaming)
    
    // 재생성 상태가 변경될 때 강제 리렌더링을 위한 카운터 업데이트
    console.log('=== Force re-render trigger ===')
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
  const isSubmittingRef = useRef(false) // 추가적인 중복 방지
  
  // Add ref to prevent duplicate deep research calls
  const deepResearchInProgress = useRef<Set<string>>(new Set())

  // Reset padding when isMobile changes
  useEffect(() => {
    if (isMobile !== undefined) {
      const basePadding = isMobile ? 320 : 160
      setDynamicPadding(basePadding)
    }
  }, [isMobile])

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
    
    // 상태 리셋을 여러 번 시도하여 확실히 적용되도록 함
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
    
    // 사용자가 수동으로 스크롤을 올렸다면 강제 스크롤 방지
    const container = messagesContainerRef.current
    const userScrolled = (container as any)?.userScrolled?.() || false
    
    if (!userScrolled) {
      // 사용자가 스크롤하지 않았을 때만 패딩 조정 및 스크롤
      adjustDynamicPadding()
      scrollToBottomSmooth(true) // Set force=true to ensure scroll to bottom
    }
  }

  // Handle image upload from ChatInput
  const handleImageUpload = useCallback((images: File[]) => {
    setUploadedImages(images)
  }, [])

  // Continue with new request after short delay
  // 병렬 딥리서치 처리 함수
  const handleParallelDeepResearch = async (
    subQuestions: string[],
    originalQuery: string,
    modelId: string,
    assistantMessageId: string,
    chatId?: string | number
  ) => {
    // Create unique key for this deep research session
    const deepResearchKey = `${assistantMessageId}_${originalQuery}_${modelId}`;
    
    try {
      console.log('🚀 ========= HANDLE PARALLEL DEEP RESEARCH START =========');
      console.log('🚀 Function called with parameters:');
      console.log('🚀 - subQuestions:', subQuestions);
      console.log('🚀 - subQuestions length:', subQuestions?.length);
      console.log('🚀 - originalQuery:', originalQuery);
      console.log('🚀 - modelId:', modelId);
      console.log('🚀 - assistantMessageId:', assistantMessageId);
      console.log('🚀 - chatId:', chatId);
      console.log('🚀 - chatId type:', typeof chatId);
      console.log('🚀 Starting parallel sub-question analysis');
      
      // Check if this deep research is already in progress
      if (deepResearchInProgress.current.has(deepResearchKey)) {
        console.log('🚫 Deep research already in progress for this session, skipping duplicate call');
        console.log('🚫 Key:', deepResearchKey);
        console.log('🚫 Active sessions:', Array.from(deepResearchInProgress.current));
        return;
      }
      
      // Mark this deep research as in progress
      deepResearchInProgress.current.add(deepResearchKey);
      console.log('✅ Deep research session started:', deepResearchKey);
      
      // Check if sub-questions are available
      if (!subQuestions || subQuestions.length === 0) {
        console.error('❌ No sub-questions provided for parallel deep research');
        console.error('❌ This usually happens when the query is too simple or vague');
        console.error('❌ Original query:', originalQuery);
        console.error('❌ Received sub-questions:', subQuestions);
        deepResearchInProgress.current.delete(deepResearchKey); // Clean up on error
        
        // Update message with helpful error
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMessageId 
              ? { 
                  ...m,
                  content: m.content + '\n\n⚠️ 질문이 너무 간단하여 세부 분석 질문을 생성할 수 없습니다. 더 구체적인 질문을 해주세요.\n\n예시: "한국의 경제 발전 과정에 대해 알려주세요" 또는 "한국 문화의 특징은 무엇인가요?"',
                  hasDeepResearchError: true,
                  isDeepResearchComplete: true
                }
              : m
          )
        );
        
        // Reset streaming state
        setIsStreaming(false);
        setStreamingMessageId(null);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        streamingInProgress.current = false;
        
        return;
      }
      
      // Generate unique IDs for each sub-question
      const subQuestionData = subQuestions.map((question, index) => ({
        id: `subq_${Date.now()}_${index}`,
        question,
        index
      }));
      
      console.log('Sub-question data with IDs:', subQuestionData);
      
      // 모든 sub-question을 병렬로 분석 (타임아웃과 재시도 로직 추가)
      const analysisPromises = subQuestionData.map(async (subQuestionItem) => {
        const { id, question, index } = subQuestionItem;
        console.log(`📊 Starting analysis ${index + 1} (${id}): ${question}`);
        
        // 타임아웃이 있는 fetch 함수
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
        
        // 재시도 로직
        let lastError: Error | null = null;
        const maxRetries = 2;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`📊 Attempt ${attempt}/${maxRetries} for analysis ${index + 1} (${id})`);
            
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
            console.log(`✅ Completed analysis ${index + 1} (${id}) on attempt ${attempt}: ${question}`);
            console.log('🔍 Sub-question analysis result:', result);
            console.log('🔍 Sub-question analysis keys:', Object.keys(result));
            console.log('🔍 Sub-question analysis content:', result.analysis);
            
            // 각 분석 완료 시 실시간 업데이트 - 고유 ID로 매핑
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { 
                      ...m,
                      deepResearchStepInfo: {
                        ...m.deepResearchStepInfo,
                        [id]: {
                          title: `Analysis: ${question}`,
                          content: result.analysis?.analysis || result.analysis || '분석 결과가 비어있습니다.',
                          isComplete: true,
                          index: index,
                          subQuestionId: id,
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
              subQuestionId: id,
              originalQuestion: question,
              index: index
            };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`❌ Failed analysis ${index + 1} (${id}) attempt ${attempt}:`, error);
            
            // 마지막 시도가 아니면 잠시 대기 후 재시도
            if (attempt < maxRetries) {
              console.log(`⏳ Retrying analysis ${index + 1} (${id}) in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            // 모든 시도 실패 시 에러 상태 업데이트
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { 
                      ...m,
                      deepResearchStepInfo: {
                        ...m.deepResearchStepInfo,
                        [id]: {
                          title: `Analysis: ${question}`,
                                                     content: `❌ 분석 중 오류가 발생했습니다 (${maxRetries}번 시도 실패): ${lastError?.message || 'Unknown error'}`,
                          isComplete: false,
                          hasError: true,
                          index: index,
                          subQuestionId: id,
                          originalQuestion: question
                        }
                      }
                    }
                  : m
              )
            );
            
            // 부분적 실패는 null 반환 (전체 프로세스를 중단하지 않음)
            return null;
          }
        }
        
        return null; // 모든 시도 실패
      });

      // 모든 분석 완료 대기
      console.log('⏳ Waiting for all analyses to complete...');
      const analysisResults = await Promise.all(analysisPromises);
      const validResults = analysisResults.filter(result => result !== null);
      
      console.log(`✅ All analyses completed: ${validResults.length}/${subQuestions.length} successful`);
      console.log('Valid results:', validResults);
      console.log('Valid results details:', validResults.map(r => ({
        subQuestionId: r.subQuestionId,
        originalQuestion: r.originalQuestion,
        index: r.index,
        hasAnalysis: !!r.analysis,
        hasContent: !!r.content,
        analysisLength: r.analysis?.length || 0
      })));

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

      // 종합 분석 수행 (타임아웃과 재시도 포함)
      console.log('🔄 Starting synthesis...');
      console.log('🔄 Valid results for synthesis:', validResults.length);
      console.log('🔄 Synthesis request data:', {
        query: originalQuery,
        modelId,
        analysisStepsCount: validResults.length
      });
      
      let synthesisResult: any = null;
      const synthesisMaxRetries = 3;
      let synthesisLastError: Error | null = null;
      
      for (let attempt = 1; attempt <= synthesisMaxRetries; attempt++) {
        try {
          console.log(`🔄 Synthesis attempt ${attempt}/${synthesisMaxRetries}`);
          
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
          console.log(`✅ Synthesis completed on attempt ${attempt}`);
          break; // 성공하면 루프 탈출
        } catch (error) {
          synthesisLastError = error instanceof Error ? error : new Error(String(error));
          console.error(`❌ Synthesis attempt ${attempt} failed:`, error);
          
          if (attempt < synthesisMaxRetries) {
            console.log(`⏳ Retrying synthesis in 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            throw new Error(`Synthesis failed after ${synthesisMaxRetries} attempts: ${synthesisLastError?.message || 'Unknown error'}`);
          }
        }
      }
      console.log('✅ Synthesis completed:', synthesisResult);
      console.log('🔍 Synthesis result keys:', Object.keys(synthesisResult));
      console.log('🔍 Synthesis content:', synthesisResult.synthesis);

      // 종합 분석 결과 업데이트
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
                    content: synthesisResult.synthesis || '종합 분석 결과가 비어있습니다.',
                    isComplete: true,
                    isSynthesis: true
                  }
                }
              }
            : m
        )
      );

      // 최종 답변 생성 (타임아웃과 재시도 포함)
      console.log('🎯 Generating final answer...');
      console.log('🎯 Final answer request data:', {
        query: originalQuery,
        modelId,
        analysisStepsCount: validResults.length,
        synthesisLength: synthesisResult.synthesis?.length || 0
      });
      
      let finalAnswerResult: any = null;
      const finalAnswerMaxRetries = 3;
      let finalAnswerLastError: Error | null = null;
      
      for (let attempt = 1; attempt <= finalAnswerMaxRetries; attempt++) {
        try {
          console.log(`🎯 Final answer attempt ${attempt}/${finalAnswerMaxRetries}`);
          
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
          console.log(`🎉 Final answer generated on attempt ${attempt}`);
          break; // 성공하면 루프 탈출
        } catch (error) {
          finalAnswerLastError = error instanceof Error ? error : new Error(String(error));
          console.error(`❌ Final answer attempt ${attempt} failed:`, error);
          
          if (attempt < finalAnswerMaxRetries) {
            console.log(`⏳ Retrying final answer generation in 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            throw new Error(`Final answer generation failed after ${finalAnswerMaxRetries} attempts: ${finalAnswerLastError?.message || 'Unknown error'}`);
          }
        }
      }
      console.log('🎉 ========= FINAL ANSWER GENERATION SUCCESS =========');
      console.log('🎉 Final answer generated successfully!');
      console.log('🎉 Final answer result:', finalAnswerResult);
      console.log('🎉 Final answer result keys:', Object.keys(finalAnswerResult));
      console.log('🎉 Final answer content:', finalAnswerResult.finalAnswer);
      console.log('🎉 Final answer length:', finalAnswerResult.finalAnswer?.length);

      // 최종 답변으로 메시지 업데이트
      const finalAnswerId = `final_answer_${Date.now()}`;
      const finalAnswerContent = finalAnswerResult.finalAnswer || finalAnswerResult.answer || '최종 답변이 생성되지 않았습니다.';
      
      console.log('🎉 Final answer content extracted:');
      console.log('🎉 - finalAnswerId:', finalAnswerId);
      console.log('🎉 - finalAnswerContent length:', finalAnswerContent.length);
      console.log('🎉 - finalAnswerContent preview:', finalAnswerContent.substring(0, 100));
      console.log('🎉 ========= FINAL ANSWER GENERATION SUCCESS END =========');
      
      console.log('🔍 Final answer processing:');
      console.log('- assistantMessageId:', assistantMessageId);
      console.log('- finalAnswerId:', finalAnswerId);
      console.log('- finalAnswerContent length:', finalAnswerContent.length);
      console.log('- finalAnswerContent preview:', finalAnswerContent.substring(0, 100));
      
      setMessages(prev => {
        console.log('🔍 Current messages before final answer update:', prev.length);
        const targetMessage = prev.find(m => m.id === assistantMessageId);
        console.log('🔍 Target message found:', !!targetMessage);
        console.log('🔍 Target message content length:', targetMessage?.content.length);
        
        const updatedMessages = prev.map(m => 
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
        );
        
        console.log('🔍 Updated messages after final answer:', updatedMessages.length);
        const updatedTargetMessage = updatedMessages.find(m => m.id === assistantMessageId);
        console.log('🔍 Updated target message content length:', updatedTargetMessage?.content.length);
        
        return updatedMessages;
      });

      console.log('🎯 ========= FINAL ANSWER PROCESSING COMPLETED =========');
      console.log('🎯 Final answer has been added to deepResearchStepInfo and will be displayed in Deep Research component');
      console.log('🎯 Final answer content length:', finalAnswerContent.length);
      
      // Note: We no longer save final answer as a separate message
      // It's displayed as part of the Deep Research component via deepResearchStepInfo
      
      console.log('💾 ========= FINAL ANSWER SAVE ATTEMPT END =========');

      // 스트리밍 상태 즉시 종료
      console.log('🔄 Ending streaming state immediately...');
      setIsStreaming(false);
      setStreamingMessageId(null);
      setIsSubmitting(false); // 제출 상태도 해제
      isSubmittingRef.current = false; // Ref도 함께 리셋
      streamingInProgress.current = false;
      
      // 추가 안전장치 - 여러 번 시도
      setTimeout(() => {
        console.log('🔄 Second attempt to end streaming state...');
        setIsStreaming(false);
        setStreamingMessageId(null);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        streamingInProgress.current = false;
      }, 100);
      
      setTimeout(() => {
        console.log('🔄 Final attempt to end streaming state...');
        setIsStreaming(false);
        setStreamingMessageId(null);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        streamingInProgress.current = false;
      }, 1000);

      console.log('🎉 Parallel deep research completed successfully!');
      
      // Clean up - remove from active sessions
      deepResearchInProgress.current.delete(deepResearchKey);
      console.log('🧹 Cleaned up deep research session:', deepResearchKey);
      console.log('🧹 Remaining active sessions:', Array.from(deepResearchInProgress.current));
      
    } catch (error) {
      console.error('❌ Parallel deep research error:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        assistantMessageId,
        originalQuery,
        modelId
      });
      
      // 에러 처리
      const errorContent = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessageId 
            ? { 
                ...m,
                content: m.content + '\n\n⚠️ 병렬 딥리서치 중 오류가 발생했습니다: ' + errorContent,
                hasDeepResearchError: true
              }
            : m
        )
      );
      
      // Clean up - remove from active sessions on error
      deepResearchInProgress.current.delete(deepResearchKey);
      console.log('🧹 Cleaned up deep research session due to error:', deepResearchKey);
      
      // 스트리밍 상태 즉시 종료 (에러 시)
      console.log('🔄 Ending streaming state due to error...');
      setIsStreaming(false);
      setStreamingMessageId(null);
      setIsSubmitting(false); // 제출 상태도 해제
      isSubmittingRef.current = false; // Ref도 함께 리셋
      streamingInProgress.current = false;
      
      // 추가 안전장치
      setTimeout(() => {
        console.log('🔄 Second attempt to end streaming state (error)...');
        setIsStreaming(false);
        setStreamingMessageId(null);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        streamingInProgress.current = false;
      }, 100);
    }
  };

  const sendMessageToAI = async (message: string, agentInfo: {id: string, type: string}, isRegeneration: boolean = false, images?: File[]) => {
    console.log('=== sendMessageToAI function called ===')
    console.log('message:', message)
    console.log('agentInfo:', agentInfo)
    console.log('isRegeneration:', isRegeneration)
    console.log('images:', images)
    console.log('session?.user?.email:', session?.user?.email)
    
    if (!session?.user?.email) {
      console.error('User authentication required')
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
    const messageKey = `${message}_${images?.length || 0}_${isRegeneration}_${isDeepResearchActive}`
    const lastMessageData = sessionStorage.getItem(`lastMessage_${chatId}`)
    
    if (lastMessageData) {
      try {
        const { message: lastMsg, timestamp: lastTime } = JSON.parse(lastMessageData)
        // Block if same message within 3 seconds (increased for deep research)
        if (lastMsg === messageKey && currentTime - lastTime < 3000) {
          console.log('Duplicate AI request blocked:', messageKey)
          return
        }
      } catch (e) {
        // If parsing fails, continue with old logic
        if (lastMessageData === messageKey) {
          console.log('Duplicate AI request blocked (fallback):', messageKey)
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
        formData.append('isDeepResearchActive', isDeepResearchActive.toString())
        formData.append('isGlobeActive', isGlobeActive.toString())
        
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
            isDeepResearchActive,
            isGlobeActive,
            userId: session?.user?.email
          })
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API response error:', errorText)
        
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
                      // 새 AI 응답 메시지 생성 시 사용자가 스크롤하지 않았을 때만 스크롤
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
                      // 스트리밍 중에는 사용자가 스크롤하지 않았을 때만 패딩 조정 및 스크롤
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
                      console.log('🚀 ========= PARALLEL PROCESSING STARTED SIGNAL =========');
                      console.log('🚀 Parallel processing started signal received');
                      console.log('🚀 Chat ID from parallel signal:', data.chatId);
                      console.log('🚀 Message ID:', data.messageId);
                      console.log('🚀 Full data:', data);
                      
                      // Store chatId for later use in parallel processing
                      storedChatId = data.chatId; // chatId를 저장 (dbMessageId 대신)
                      console.log('🚀 Stored Chat ID:', storedChatId);
                      
                      // 저장된 Deep Research 데이터가 있다면 병렬 처리 시작
                      if (storedDeepResearchData && storedDeepResearchData.stepInfo?.useParallelProcessing && storedDeepResearchData.stepInfo?.subQuestions) {
                        console.log('🚀 Starting parallel processing with stored data');
                        console.log('🚀 Stored deep research data:', storedDeepResearchData);
                        
                        // Sub-questions를 메시지 내용으로 저장
                        assistantContent += storedDeepResearchData.content;
                        
                        // 병렬 처리 시작
                        console.log('🚀 About to call handleParallelDeepResearch from stored data...');
                        
                        handleParallelDeepResearch(
                          storedDeepResearchData.stepInfo.subQuestions,
                          storedDeepResearchData.stepInfo.originalQuery,
                          storedDeepResearchData.stepInfo.modelId,
                          assistantMessageId,
                          storedChatId
                        );
                        
                        console.log('🚀 handleParallelDeepResearch called from stored data');
                        
                        // 저장된 데이터 초기화
                        storedDeepResearchData = null;
                      } else {
                        console.log('🚀 No stored deep research data available for parallel processing');
                        console.log('🚀 storedDeepResearchData:', storedDeepResearchData);
                      }
                      
                      console.log('🚀 ========= PARALLEL PROCESSING STARTED SIGNAL END =========');
                    }

                    // Handle Deep Research streaming
                    if (data.deepResearchStream) {
                      console.log('🚀 Deep Research Stream received:', data);
                      
                      // 계획된 스탭들 처리
                      if (data.stepInfo && data.stepInfo.plannedSteps) {
                        setDeepResearchPlannedSteps(data.stepInfo.plannedSteps)
                      }
                      
                      // 병렬 처리용 데이터 저장
                      if (data.stepInfo?.useParallelProcessing && data.stepInfo?.subQuestions) {
                        console.log('🚀 Storing deep research data for later parallel processing');
                        storedDeepResearchData = data;
                        console.log('🚀 Stored deep research data:', storedDeepResearchData);
                      }
                      
                      // 병렬 처리 모드 확인
                      if (data.stepInfo?.useParallelProcessing && data.stepInfo?.subQuestions) {
                        console.log('🚀 ========= PARALLEL PROCESSING TRIGGER =========');
                        console.log('🚀 Parallel processing condition met!');
                        console.log('🚀 data.stepInfo?.useParallelProcessing:', data.stepInfo?.useParallelProcessing);
                        console.log('🚀 data.stepInfo?.subQuestions length:', data.stepInfo?.subQuestions?.length);
                        console.log('🚀 Step info:', data.stepInfo);
                        console.log('🚀 Sub-questions from step info:', data.stepInfo.subQuestions);
                        console.log('🚀 Assistant message ID:', assistantMessageId);
                        console.log('🚀 Chat ID from data:', data.chatId);
                        console.log('🚀 Stored Chat ID:', storedChatId);
                        
                        // Sub-questions를 메시지 내용으로 저장
                        assistantContent += data.content;
                        
                        // 병렬 처리 시작 (저장된 Chat ID 사용)
                        const finalChatId = storedChatId || data.chatId;
                        console.log('🚀 Final Chat ID to use:', finalChatId);
                        console.log('🚀 Final Chat ID type:', typeof finalChatId);
                        
                        console.log('🚀 About to call handleParallelDeepResearch...');
                        console.log('🚀 Parameters:');
                        console.log('🚀 - subQuestions:', data.stepInfo.subQuestions);
                        console.log('🚀 - originalQuery:', data.stepInfo.originalQuery);
                        console.log('🚀 - modelId:', data.stepInfo.modelId);
                        console.log('🚀 - assistantMessageId:', assistantMessageId);
                        console.log('🚀 - finalChatId:', finalChatId);
                        
                        handleParallelDeepResearch(
                          data.stepInfo.subQuestions,
                          data.stepInfo.originalQuery,
                          data.stepInfo.modelId,
                          assistantMessageId,
                          finalChatId
                        );
                        
                        console.log('🚀 handleParallelDeepResearch called successfully');
                        console.log('🚀 ========= PARALLEL PROCESSING TRIGGER END =========');
                      } else {
                        console.log('🚀 ========= PARALLEL PROCESSING NOT TRIGGERED =========');
                        console.log('🚀 Reason: Parallel processing condition not met');
                        console.log('🚀 data.stepInfo?.useParallelProcessing:', data.stepInfo?.useParallelProcessing);
                        console.log('🚀 data.stepInfo?.subQuestions:', data.stepInfo?.subQuestions);
                        console.log('🚀 data.stepInfo?.subQuestions length:', data.stepInfo?.subQuestions?.length);
                        console.log('🚀 data.stepInfo full object:', data.stepInfo);
                        console.log('🚀 ========= PARALLEL PROCESSING NOT TRIGGERED END =========');
                        
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
                      // 딥리서치 스트리밍 중에는 사용자가 스크롤하지 않았을 때만 더 자주 스크롤
                      const container = messagesContainerRef.current
                      const userScrolled = (container as any)?.userScrolled?.() || false
                      
                      if (!userScrolled) {
                        adjustDynamicPadding()
                        scrollToBottomSmooth(true)
                      }
                    }

                    // Handle Deep Research final result
                    if (data.deepResearchFinal) {
                      assistantContent = data.content // 최종 결과로 완전히 대체
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
                      
                      // 스트리밍 완료 시점에서 즉시 상태 리셋
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
        
        // 에러 발생 시에도 재생성 상태 리셋
        console.log('Resetting regenerating state due to error')
        setRegeneratingMessageId(null)
      }
    } finally {
      console.log('=== sendMessageToAI finally block ===')
      console.log('Resetting all streaming states')
      
      // 즉시 상태 리셋
      streamingInProgress.current = false
      setIsStreaming(false)
      setIsSubmitting(false)
      isSubmittingRef.current = false
      setRegeneratingMessageId(null)
      setStreamingMessageId(null)
      abortControllerRef.current = null
      console.log('All streaming states reset')
      
      // 상태 리셋을 여러 번 시도하여 확실히 적용되도록 함
      setTimeout(() => {
        console.log('=== First safety check - Reset regeneration state ===')
        setRegeneratingMessageId(null)
        setIsStreaming(false)
        setIsSubmitting(false)
        isSubmittingRef.current = false
      }, 100)
      
      setTimeout(() => {
        console.log('=== Second safety check - Reset regeneration state ===')
        setRegeneratingMessageId(null)
        setIsSubmitting(false)
        isSubmittingRef.current = false
        setIsStreaming(false)
      }, 500)
      
      setTimeout(() => {
        console.log('=== Final safety check - Force reset regeneration state ===')
        setRegeneratingMessageId(null)
        setIsStreaming(false)
        setIsSubmitting(false)
        isSubmittingRef.current = false
      }, 1000) // 1초 후 강제 리셋
      
      // 스트리밍 완료 후 사용자가 수동으로 스크롤을 올렸다면 강제 스크롤 방지
      const container = messagesContainerRef.current
      const userScrolled = (container as any)?.userScrolled?.() || false
      
      if (!userScrolled) {
        // 사용자가 스크롤하지 않았을 때만 최종 패딩 조정 및 스크롤
        adjustDynamicPadding()
        scrollToBottomSmooth(true) // Force scroll
        
        // 스트리밍 완료 후 한 번만 추가 스크롤 (DOM 업데이트 대기)
        setTimeout(() => {
          if (!(container as any)?.userScrolled?.()) {
            scrollToBottomSmooth()
          }
        }, 100)
      }
      
      // 베이스 패딩 복원 (지연 시간 증가)
      setTimeout(() => {
        setDynamicPadding(isMobile ? 320 : 160)
      }, 3000) // 3초 후 복원하여 사용자 스크롤 방해 최소화
      
      // Clear duplicate prevention after request completes
      setTimeout(() => {
        sessionStorage.removeItem(`lastMessage_${chatId}`)
      }, 3000) // Clear after 3 seconds
    }
  }

  // Load chat history when chatId or session changes
  useEffect(() => {
    let isCancelled = false
    
    console.log('=== ChatPage useEffect triggered ===')
    console.log('chatId:', chatId)
    console.log('session?.user?.email:', session?.user?.email)
    console.log('sessionStatus:', sessionStatus)
    
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
          console.log('=== Fetching chat history ===')
          console.log('URL:', `/api/chat/${chatId}`)
          const response = await fetch(`/api/chat/${chatId}`)
          console.log('Response status:', response.status)
          if (isCancelled) return
          
          if (response.status === 401 || response.status === 404) {
            // 인증 오류 또는 리소스 없음 시 홈페이지로 리다이렉트
            console.log('Chat session not found or access denied, redirecting to home')
            toast.error('채팅 세션을 찾을 수 없습니다. 홈으로 이동합니다.')
            router.push('/')
            return
          }
          
          if (response.ok) {
            const data = await response.json()
            console.log('Chat history data:', data)
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
            console.log('Processed messages:', messagesWithDateTimestamp)
            
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
                console.log('Messages set, length:', messagesWithDateTimestamp.length)
                
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
                      
                      // Call streaming API with isRegeneration=true to prevent duplicate user message saving
                      sendMessageToAI(lastMessage.content, parsedAgentInfo, true)
                      
                      // Clean up localStorage after use (delay to prevent race condition)
                      setTimeout(() => {
                        localStorage.removeItem(`chat_${chatId}_agent`)
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
            console.error('Response status:', response.status)
            const errorText = await response.text()
            console.error('Error response:', errorText)
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
                  console.log('=== History loading completed ===')
                  console.log('historyLoaded: true, showSkeleton: false')
                  
                  // Move to bottom immediately after content is loaded (without animation)
                  // 여러 단계로 스크롤 처리하여 확실하게 맨 밑으로 이동
                  setTimeout(() => {
                    scrollToBottomInstant()
                  }, 100)
                  
                  // 추가 스크롤 처리 - DOM 완전 렌더링 후
                  setTimeout(() => {
                    scrollToBottomInstant()
                  }, 300)
                  
                  // 최종 스크롤 처리
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
      // chatId나 session이 없으면 최소 시간 후 로딩 완료 처리
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
      // 사용자가 수동으로 스크롤을 올렸는지 확인
      const container = messagesContainerRef.current
      const userScrolled = (container as any)?.userScrolled?.() || false
      
      if (isInitialLoad) {
        // 초기 로드 시에는 사용자 스크롤 상태에 관계없이 맨 밑으로 이동
        setTimeout(() => scrollToBottomInstant(), 100)
        setTimeout(() => scrollToBottomInstant(), 300)
        setTimeout(() => scrollToBottomInstant(), 600)
        setIsInitialLoad(false)
      } else if (!userScrolled || isStreaming) {
        // 사용자가 스크롤하지 않았거나 스트리밍 중일 때만 스크롤
        setTimeout(() => scrollToBottomSmooth(true), 100)
        // 스트리밍 중이 아닐 때는 추가 스크롤 최소화
        if (isStreaming) {
          setTimeout(() => scrollToBottomInstant(), 300)
          setTimeout(() => scrollToBottomInstant(), 600)
        }
      }
      
      // 패딩 조정은 사용자 스크롤 상태에 관계없이 수행
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
      // 스크롤 이벤트 디바운싱으로 성능 최적화
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      scrollTimeout = setTimeout(() => {
        // 사용자가 수동으로 스크롤했는지 확인
        if (!isScrollingToBottom.current) {
          const { scrollTop, scrollHeight, clientHeight } = container
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 80
          
          // 사용자가 위로 스크롤했다면 userScrolled 플래그 설정
          if (!isAtBottom) {
            userScrolled = true
            // 스크롤이 상단으로 이동할 때 렌더링 안정성 확보
            container.style.contentVisibility = 'auto'
          } else {
            // 사용자가 다시 맨 밑으로 스크롤했다면 플래그 해제
            userScrolled = false
          }
        }
      }, 16) // 60fps에 맞춰 디바운싱
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // userScrolled 상태를 container에 저장하여 다른 함수에서 접근 가능하게 함
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
      
      // 여러 번 시도하여 확실하게 맨 밑으로 스크롤
      const scrollToMax = () => {
        // 스크롤 높이를 다시 계산하여 최신 값 사용
        const maxScrollTop = container.scrollHeight - container.clientHeight
        container.scrollTop = Math.max(0, maxScrollTop)
        lastScrollHeight.current = container.scrollHeight
      }
      
      // 즉시 스크롤
      scrollToMax()
      
      // DOM 업데이트를 위한 다중 시도
      requestAnimationFrame(() => {
        scrollToMax()
        
        requestAnimationFrame(() => {
          scrollToMax()
          
          // 100ms 후 한 번 더
          setTimeout(() => {
            scrollToMax()
            
            // 300ms 후 최종 확인
            setTimeout(() => {
              scrollToMax()
              isScrollingToBottom.current = false
            }, 300)
          }, 100)
        })
      })
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
      // 실패 시 롤백
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
    
    // 낙관적 업데이트
    setDislikedMessages((prev) => {
      const newSet = new Set(prev)
      if (isCurrentlyDisliked) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
        // 싫어요 시 좋아요 제거
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
      // 실패 시 롤백
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
    // 메시지 내용 업데이트
    const updatedMessages = messages.map((msg) => 
      msg.id === messageId ? { ...msg, content: editingContent } : msg
    )
    setMessages(updatedMessages)
    
    // 편집 상태 초기화
    setEditingMessageId(null)
    const savedContent = editingContent
    setEditingContent("")

    // 편집된 사용자 메시지인 경우 해당 메시지 이후 모든 메시지 삭제하고 재생성
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    const editedMessage = messages[messageIndex]
    
    if (editedMessage && editedMessage.role === "user" && selectedModel && chatId && session?.user?.email) {
      // 스트리밍 중이면 먼저 중단
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
    console.log('=== handleRegenerateFromUserMessage called ===')
    console.log('messageId:', messageId)
    console.log('isStreaming:', isStreaming)
    console.log('regeneratingMessageId:', regeneratingMessageId)
    
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
        console.log('Setting regeneratingMessageId to:', messageId)
        setRegeneratingMessageId(messageId)
        
        // 사용자 메시지 다음부터의 모든 메시지가 있는지 확인
        const nextMessageIndex = messageIndex + 1
        if (nextMessageIndex < messages.length) {
          const nextMessage = messages[nextMessageIndex]
          
          try {
            console.log('=== Attempting to delete messages from database ===');
            console.log('nextMessage.id:', nextMessage.id);
            console.log('chatId:', chatId);
            console.log('session.user.email:', session.user.email);
            
            // 데이터베이스에서 해당 메시지부터 이후 모든 메시지 삭제
            const response = await fetch(`/api/chat/${chatId}?userId=${session.user.email}&fromMessageId=${nextMessage.id}`, {
              method: 'DELETE'
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('Delete API response not ok:', response.status, errorData);
              throw new Error(`Failed to delete messages from database: ${response.status} ${errorData.error || response.statusText}`);
            }
            
            const deleteResult = await response.json();
            console.log('Delete operation successful:', deleteResult);
            
            if (deleteResult.success) {
              console.log(`Successfully deleted ${deleteResult.deletedCount} messages from database`);
              console.log(`Remaining messages in database: ${deleteResult.remainingCount}`);
              
              // 삭제 작업이 완료된 후 실제로 메시지가 삭제되었는지 검증
              if (deleteResult.deletedCount > 0) {
                console.log('=== Verifying deletion by reloading chat history ===');
                
                // 잠시 후 채팅 기록을 다시 로드하여 삭제가 제대로 되었는지 확인
                setTimeout(async () => {
                  try {
                    const verifyResponse = await fetch(`/api/chat/${chatId}`);
                    if (verifyResponse.ok) {
                      const verifyData = await verifyResponse.json();
                      const currentMessages = verifyData.messages || [];
                      
                      console.log('Verification: Current messages in database:', currentMessages.length);
                      
                      // 삭제된 메시지가 여전히 존재하는지 확인
                      const deletedMessageStillExists = currentMessages.some((msg: any) => msg.id === nextMessage.id);
                      
                      if (deletedMessageStillExists) {
                        console.error('ERROR: Deleted message still exists in database!');
                        console.error('This may cause the regeneration issue on page refresh');
                      } else {
                        console.log('✓ Verification successful: Messages properly deleted from database');
                      }
                    }
                  } catch (verifyError) {
                    console.error('Failed to verify deletion:', verifyError);
                  }
                }, 1000);
              }
            } else {
              console.warn('Delete operation reported failure:', deleteResult);
            }
          } catch (error) {
            console.error('Error deleting messages from database:', error);
            
            // 사용자에게 에러 알림 (선택사항)
            if (error instanceof Error && error.message.includes('Failed to delete messages')) {
              console.warn('Database deletion failed, but continuing with UI update');
              // 여기서 사용자에게 알림을 표시할 수 있습니다
              // alert('일부 메시지 삭제에 실패했지만 계속 진행합니다.');
            }
            
            // 데이터베이스 삭제 실패해도 UI에서는 진행
            console.log('Continuing with regeneration despite database deletion error');
          }
        } else {
          console.log('No messages to delete after current user message');
        }
        
        // 해당 사용자 메시지 이후의 모든 메시지 제거 (사용자 메시지는 유지)
        setMessages(messages.slice(0, messageIndex + 1))
        
        // 스크롤을 현재 위치로 이동
        setTimeout(() => scrollToBottomSmooth(), 100)

        // 재생성을 위한 상태 초기화 및 AI 요청
        setTimeout(async () => {
          console.log('=== Starting regeneration process ===')
          console.log('selectedModel:', selectedModel)
          console.log('chatId:', chatId)
          console.log('session?.user?.email:', session?.user?.email)
          
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
          
          console.log('=== Calling sendMessageToAI ===')
          console.log('messageContent:', messageContent)
          console.log('agentInfo:', { id: selectedModel.id, type: selectedModel.type })
          console.log('isRegeneration:', true)
          console.log('imagesToSend:', imagesToSend)
          
          try {
            await sendMessageToAI(messageContent, {
              id: selectedModel.id,
              type: selectedModel.type
            }, true, imagesToSend)
            console.log('=== Regeneration sendMessageToAI completed ===')
          } catch (error) {
            console.error('Error in sendMessageToAI during regeneration:', error)
            // 재생성 중 에러 발생 시 상태 리셋
            console.log('Resetting regeneration state due to error in regeneration')
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
      console.log('Already submitting, preventing duplicate')
      return
    }
    
    // 중복 메시지 검사 (같은 메시지가 500ms 이내에 전송되는 경우)
    const currentTime = Date.now()
    const messageToCheck = inputValue.trim() || 'IMAGE_ONLY'
    
    if (lastSubmittedMessage.current === messageToCheck && 
        currentTime - lastSubmittedTime.current < 500) {
      console.log('Duplicate message detected, preventing submission')
      return
    }
    
    // 빈 메시지 체크 (텍스트도 없고 이미지도 없는 경우)
    if (!inputValue.trim() && uploadedImages.length === 0) {
      console.log('Empty message, preventing submission')
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
        console.log('New message submission - resetting regeneration state')
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
    console.log('=== Rendering messages ===')
    console.log('messages.length:', messages.length)
    console.log('historyLoaded:', historyLoaded)
    console.log('showSkeleton:', showSkeleton)
    console.log('regeneratingMessageId:', regeneratingMessageId)
    console.log('isStreaming:', isStreaming)
    
    return messages.map((message, index) => (
      <MessageWrapper
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
              console.log('=== Render condition check ===')
              console.log('!historyLoaded && showSkeleton:', !historyLoaded && showSkeleton)
              console.log('!historyLoaded && !showSkeleton:', !historyLoaded && !showSkeleton)
              console.log('else (should render messages):', historyLoaded)
              console.log('renderedMessages length:', renderedMessages.length)
              
              if (!historyLoaded && showSkeleton) {
                console.log('Rendering skeleton')
                return <ChatMessageSkeleton />
              } else if (!historyLoaded && !showSkeleton) {
                console.log('Rendering empty div')
                return <div></div>
              } else {
                console.log('Rendering messages')
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
