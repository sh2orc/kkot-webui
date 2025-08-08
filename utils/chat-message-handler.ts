/**
 * Message processing related utility functions
 */
import { Message } from '@/components/contents/chat-types';
import { toast } from 'sonner';
import { fetchWithTimeout } from './chat-utils';

/**
 * Send message to AI function
 * @param chatId Chat ID
 * @param message Message content
 * @param agentInfo Agent information
 * @param isRegeneration Regeneration status
 * @param images Image file array
 * @param session Session information
 * @param isDeepResearchActive Deep research active status
 * @param isGlobeActive Globe active status
 * @param abortControllerRef Abort controller reference
 * @param streamingInProgress Streaming progress state reference
 * @param setIsStreaming Streaming state update function
 * @param setStreamingMessageId Streaming message ID update function
 * @param setNewMessageIds New message ID update function
 * @param setMessages Message state update function
 * @param adjustDynamicPadding Dynamic padding adjustment function
 * @param scrollToBottomSmooth Smooth scroll function
 * @param handleParallelDeepResearch Parallel deep research processing function
 * @param deepResearchInProgress Reference to in-progress deep research
 * @param setRegeneratingMessageId Regenerating message ID update function
 */
export const sendMessageToAI = async (
  chatId: string | number | undefined,
  message: string,
  agentInfo: {id: string, type: string},
  isRegeneration: boolean = false,
  images?: File[],
  session?: any,
  isDeepResearchActive?: boolean,
  isGlobeActive?: boolean,
  abortControllerRef?: React.MutableRefObject<AbortController | null>,
  streamingInProgress?: React.MutableRefObject<boolean>,
  setIsStreaming?: React.Dispatch<React.SetStateAction<boolean>>,
  setStreamingMessageId?: React.Dispatch<React.SetStateAction<string | null>>,
  setNewMessageIds?: React.Dispatch<React.SetStateAction<Set<string>>>,
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>,
  adjustDynamicPadding?: () => void,
  scrollToBottomSmooth?: (force?: boolean) => void,
  handleParallelDeepResearch?: any,
  deepResearchInProgress?: React.MutableRefObject<Set<string>>,
  setRegeneratingMessageId?: React.Dispatch<React.SetStateAction<string | null>>,
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>
) => {
  if (!setMessages || !setIsStreaming || !setStreamingMessageId || !setNewMessageIds) return;
  
  // Check deep research status from URL parameters and localStorage (timing issue handling)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlDeepResearch = urlParams?.get('deepResearch') === 'true';
  const urlGlobe = urlParams?.get('globe') === 'true';
  
  // Check deep research and globe status from localStorage
  const localDeepResearch = chatId ? localStorage.getItem(`chat_${chatId}_deepResearch`) === 'true' : false;
  const localGlobe = chatId ? localStorage.getItem(`chat_${chatId}_globe`) === 'true' : false;
  
  // Use URL parameters first, then localStorage, and finally React state
  const finalDeepResearch = urlDeepResearch || localDeepResearch || !!isDeepResearchActive;
  const finalGlobe = urlGlobe || localGlobe || !!isGlobeActive;
  
  if (!session?.user?.email) {
    return;
  }

  // If already streaming, abort and start new request
  if (streamingInProgress?.current) {
    if (abortControllerRef?.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamingInProgress.current = false;
    setIsStreaming(false);
    setRegeneratingMessageId?.(null);
    setStreamingMessageId(null);
    
    // Wait for message update
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Enhanced duplicate prevention: use message content + timestamp + deep research status
  const currentTime = Date.now();
  const messageKey = `${message}_${images?.length || 0}_${isRegeneration}_${finalDeepResearch}`;
  const lastMessageData = sessionStorage.getItem(`lastMessage_${chatId}`);
  
  if (lastMessageData) {
    try {
      const { message: lastMsg, timestamp: lastTime } = JSON.parse(lastMessageData);
      // Block same message within 3 seconds (increased time for deep research)
      if (lastMsg === messageKey && currentTime - lastTime < 3000) {
        return;
      }
    } catch (e) {
      // Use previous logic if parsing fails
      if (lastMessageData === messageKey) {
        return;
      }
    }
  }
  
  sessionStorage.setItem(`lastMessage_${chatId}`, JSON.stringify({
    message: messageKey,
    timestamp: currentTime
  }));

  // If previous request exists, abort
  if (abortControllerRef?.current) {
    abortControllerRef.current.abort();
  }

  // Create new AbortController
  const abortController = new AbortController();
  if (abortControllerRef) abortControllerRef.current = abortController;
  if (streamingInProgress) streamingInProgress.current = true;
  setIsStreaming(true);
  
  // Adjust padding and scroll
  if (adjustDynamicPadding) adjustDynamicPadding();
  if (scrollToBottomSmooth) scrollToBottomSmooth(true); // force=true to ensure scroll

  try {
    let response: Response;

    if (images && images.length > 0) {
      // Use FormData when images are present
      const formData = new FormData();
      formData.append('message', message);
      if (agentInfo.type === 'agent') {
        formData.append('agentId', agentInfo.id);
      } else {
        formData.append('modelId', agentInfo.id);
      }
      formData.append('modelType', agentInfo.type);
      formData.append('isRegeneration', isRegeneration.toString());
      formData.append('isDeepResearchActive', finalDeepResearch.toString());
      formData.append('isGlobeActive', finalGlobe.toString());
      
      // Add image files
      images.forEach((image) => {
        formData.append('images', image);
      });
      
      // Add user ID for authentication
      formData.append('userId', session?.user?.email || '');
      
      response = await fetch(`/api/chat/${chatId}`, {
        method: 'POST',
        body: formData
      });
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
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      
      // Parse error message from response
      let errorMessage = 'Message sending failed';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Use raw error text if parsing fails
        errorMessage = errorText || `HTTP ${response.status} error`;
      }
      
      throw new Error(errorMessage);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let assistantContent = '';
      let assistantMessageId = '';
      let storedChatId: string | number | undefined = undefined;
      let storedDeepResearchData: any = null; // For storing deep research data

      const processStream = async () => {
        try {
          while (true) {
            if (abortController.signal.aborted) {
              break;
            }

            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.error) {
                    // Avoid triggering Next.js error overlay; show toast to user instead
                    console.warn('AI response warning:', data.error);
                    try {
                      toast.error(data.error);
                    } catch {}
                    // Reset streaming state on error for UX consistency
                    setIsStreaming(false);
                    if (setRegeneratingMessageId) setRegeneratingMessageId(null);
                    setStreamingMessageId(null);
                    if (streamingInProgress) streamingInProgress.current = false;
                    break;
                  }

                  if (data.messageId && !assistantMessageId) {
                    assistantMessageId = data.messageId;
                    setStreamingMessageId(assistantMessageId);
                    // Add new message ID
                    setNewMessageIds(prev => new Set([...prev, assistantMessageId]));
                    // Initialize AI response message
                    setMessages(prev => [...prev, {
                      id: assistantMessageId,
                      role: "assistant" as const,
                      content: '',
                      timestamp: new Date(),
                    }]);
                    // Scroll only if user hasn't manually scrolled
                    const container = messagesContainerRef?.current;
                    const userScrolled = container ? (container as any)?.userScrolled?.() || false : false;
                    
                    if (!userScrolled) {
                      if (adjustDynamicPadding) adjustDynamicPadding();
                      if (scrollToBottomSmooth) scrollToBottomSmooth(true); // force=true로 설정하여 스크롤 보장
                    }
                  }

                  if (data.content) {
                    assistantContent += data.content;
                    // Update AI response in real-time
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessageId 
                          ? { ...m, content: assistantContent }
                          : m
                      )
                    );
                    // Adjust padding and scroll only if user hasn't manually scrolled during streaming
                    if (assistantContent.length % 100 === 0) {
                      const container = messagesContainerRef?.current;
                      const userScrolled = container ? (container as any)?.userScrolled?.() || false : false;
                      
                      if (!userScrolled) {
                        if (adjustDynamicPadding) adjustDynamicPadding();
                        if (scrollToBottomSmooth) scrollToBottomSmooth(true); // force=true로 설정하여 스크롤 보장
                      }
                    }
                  }
                  
                  if (data.parallelProcessingStarted && data.chatId) {
                    console.log('🚀 병렬 처리 시작 신호 수신:', {
                      chatId: data.chatId,
                      hasStoredData: !!storedDeepResearchData,
                      storedDataSubQuestions: storedDeepResearchData?.stepInfo?.subQuestions?.length || 0
                    });
                    
                    // Save chatId for later use in parallel processing
                    storedChatId = data.chatId;
                    
                    // Start parallel processing if stored deep research data exists
                    if (storedDeepResearchData && storedDeepResearchData.stepInfo?.useParallelProcessing && storedDeepResearchData.stepInfo?.subQuestions) {
                      console.log('🎯 저장된 데이터로 병렬 처리 시작:', {
                        subQuestionsCount: storedDeepResearchData.stepInfo.subQuestions.length,
                        originalQuery: storedDeepResearchData.stepInfo.originalQuery,
                        modelId: storedDeepResearchData.stepInfo.modelId,
                        assistantMessageId,
                        storedChatId
                      });
                      
                      // Save sub-questions to message content
                      assistantContent += storedDeepResearchData.content;
                      
                      // Start parallel processing
                      if (handleParallelDeepResearch) {
                        // Check if chatId is valid and pass it
                        const validChatId = storedChatId || data.chatId || chatId;
                        if (!validChatId) {
                          console.error('Valid chatId is missing, cannot proceed with parallel processing using stored data.');
                          return;
                        }
                        
                        handleParallelDeepResearch(
                          storedDeepResearchData.stepInfo.subQuestions,
                          storedDeepResearchData.stepInfo.originalQuery,
                          storedDeepResearchData.stepInfo.modelId,
                          assistantMessageId,
                          validChatId,
                          setMessages,
                          deepResearchInProgress,
                          setIsStreaming,
                          setStreamingMessageId
                        );
                      }
                      
                      // Reset stored data
                      storedDeepResearchData = null;
                    }
                  }

                  // Process deep research streaming
                  if (data.deepResearchStream) {
                    console.log('🔍 Deep research streaming data:', {
                      stepType: data.stepType,
                      stepInfo: data.stepInfo,
                      hasSubQuestions: !!data.stepInfo?.subQuestions,
                      useParallelProcessing: data.stepInfo?.useParallelProcessing,
                      subQuestionsCount: data.stepInfo?.subQuestions?.length || 0,
                      content: data.content?.substring(0, 100)
                    });
                    
                    // Save data for parallel processing
                    if (data.stepInfo?.useParallelProcessing && data.stepInfo?.subQuestions) {
                      storedDeepResearchData = data;
                    }
                    
                    // Check parallel processing mode
                    if (data.stepInfo?.useParallelProcessing && data.stepInfo?.subQuestions) {
                      console.log('🎯 Direct parallel processing started:', {
                        subQuestionsCount: data.stepInfo.subQuestions.length,
                        originalQuery: data.stepInfo.originalQuery,
                        modelId: data.stepInfo.modelId,
                        assistantMessageId,
                        storedChatId,
                        dataChatId: data.chatId
                      });
                      
                      // Save sub-questions to message content
                      assistantContent += data.content;
                      
                      // Start parallel processing (use stored Chat ID)
                      const finalChatId = storedChatId || data.chatId;
                      
                      if (handleParallelDeepResearch) {
                        // Check if chatId is valid and pass it
                        const validChatId = finalChatId || chatId;
                        if (!validChatId) {
                          console.error('Valid chatId is missing, cannot proceed with parallel processing.');
                          return;
                        }
                        
                        handleParallelDeepResearch(
                          data.stepInfo.subQuestions,
                          data.stepInfo.originalQuery,
                          data.stepInfo.modelId,
                          assistantMessageId,
                          validChatId,
                          setMessages,
                          deepResearchInProgress,
                          setIsStreaming,
                          setStreamingMessageId
                        );
                      }
                    } else {
                      // Original sequential processing logic
                      // Step-by-step processing: save sub-questions and final answer (final) to message content
                      if (data.stepType === 'final' || 
                          (data.stepType === 'step' && data.stepInfo?.title === 'Sub-questions Generated')) {
                        // Save sub-questions and final answer to message content and show streaming
                        assistantContent += data.content;
                      }
                      // Other analysis processes (step, synthesis) are not saved to message content (only displayed in deep research component)
                    }
                    
                    // Update AI response in real-time with deep research streaming
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessageId 
                          ? { 
                              ...m, 
                              content: assistantContent, 
                              isDeepResearch: true, 
                              deepResearchStepType: data.stepType,
                              deepResearchStepInfo: {
                                ...m.deepResearchStepInfo,
                                ...data.stepInfo || {},
                                currentStepContent: data.content,
                                currentStepType: data.stepType
                              }
                            }
                          : m
                      )
                    );
                    
                    // Scroll only if user hasn't manually scrolled during deep research streaming
                    const container = messagesContainerRef?.current;
                    const userScrolled = container ? (container as any)?.userScrolled?.() || false : false;
                    
                    if (!userScrolled) {
                      if (adjustDynamicPadding) adjustDynamicPadding();
                      if (scrollToBottomSmooth) scrollToBottomSmooth(true);
                    }
                  }

                  // Process deep research final result
                  if (data.deepResearchFinal) {
                    assistantContent = data.content; // Replace with final result
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessageId 
                          ? { ...m, content: assistantContent, isDeepResearch: true, isDeepResearchComplete: true }
                          : m
                      )
                    );
                    
                    const container = messagesContainerRef?.current;
                    const userScrolled = container ? (container as any)?.userScrolled?.() || false : false;
                    
                    if (!userScrolled) {
                      if (adjustDynamicPadding) adjustDynamicPadding();
                      if (scrollToBottomSmooth) scrollToBottomSmooth(true);
                    }
                  }

                  // Process deep research error
                  if (data.deepResearchError) {
                    assistantContent += data.content;
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessageId 
                          ? { ...m, content: assistantContent, isDeepResearch: true, hasDeepResearchError: true }
                          : m
                      )
                    );
                    
                    const container = messagesContainerRef?.current;
                    const userScrolled = container ? (container as any)?.userScrolled?.() || false : false;
                    
                    if (!userScrolled) {
                      if (adjustDynamicPadding) adjustDynamicPadding();
                      if (scrollToBottomSmooth) scrollToBottomSmooth(true);
                    }
                  }

                  if (data.titleGenerated) {
                    // If title is generated, refresh sidebar immediately
                    const eventDetail = { chatId: data.chatId, title: data.title };
                    window.dispatchEvent(new CustomEvent('chatTitleUpdated', { 
                      detail: eventDetail
                    }));
                  }

                  if (data.done) {
                    console.log('=== Streaming completed (data.done=true) ===');
                    
                    // Reset streaming state immediately
                    console.log('=== Reset streaming state immediately ===');
                    setIsStreaming(false);
                    if (setRegeneratingMessageId) setRegeneratingMessageId(null);
                    setStreamingMessageId(null);
                    if (streamingInProgress) streamingInProgress.current = false;
                    
                    break;
                  }
                } catch (e) {
                  // Ignore JSON parsing error
                }
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            // Stream processing aborted
          } else {
            console.error('Stream processing error:', error);
          }
        }
      };

      await processStream();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // AI message sending aborted
    } else {
      console.error('AI message sending error:', error);
      // Show error toast to user
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred';
      toast.error(errorMessage);
      
      // Reset regeneration state due to error
      if (setRegeneratingMessageId) setRegeneratingMessageId(null);
    }
  } finally {
    // Reset state immediately
    if (streamingInProgress) streamingInProgress.current = false;
    setIsStreaming(false);
    if (setRegeneratingMessageId) setRegeneratingMessageId(null);
    setStreamingMessageId(null);
    if (abortControllerRef) abortControllerRef.current = null;
    
    // Reset state multiple times to ensure application
    setTimeout(() => {
      if (setRegeneratingMessageId) setRegeneratingMessageId(null);
      setIsStreaming(false);
    }, 100);
    
    setTimeout(() => {
      if (setRegeneratingMessageId) setRegeneratingMessageId(null);
      setIsStreaming(false);
    }, 500);
    
    setTimeout(() => {
      if (setRegeneratingMessageId) setRegeneratingMessageId(null);
      setIsStreaming(false);
    }, 1000);
    
    // Prevent forced scroll after streaming completion if user manually scrolled
    const container = messagesContainerRef?.current;
    const userScrolled = container ? (container as any)?.userScrolled?.() || false : false;
    
    if (!userScrolled) {
      // Adjust final padding and scroll only if user hasn't manually scrolled
      if (adjustDynamicPadding) adjustDynamicPadding();
      if (scrollToBottomSmooth) scrollToBottomSmooth(true); // Force scroll

      // Scroll again after streaming completion (wait for DOM update)
      setTimeout(() => {
        if (container && !(container as any)?.userScrolled?.()) {
          if (scrollToBottomSmooth) scrollToBottomSmooth();
        }
      }, 100);
    }
    
    // Remove duplicate prevention session storage
    setTimeout(() => {
      sessionStorage.removeItem(`lastMessage_${chatId}`);
    }, 3000); // Remove after 3 seconds
  }
}; 