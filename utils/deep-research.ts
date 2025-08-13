/**
 * Deep research utility functions
 */
import { fetchWithTimeout } from './chat-utils';
import { loadTranslationModule, getStoredLanguage, getTranslationKey } from '@/lib/i18n';
import { Message } from '@/components/contents/chat-types';

/**
 * Parallel deep research processing function
 * @param subQuestions Sub-question array
 * @param originalQuery Original question
 * @param modelId Model ID
 * @param assistantMessageId Assistant message ID
 * @param providedChatId Chat ID
 * @param setMessages Message state update function
 * @param deepResearchInProgress Reference to in-progress deep research
 * @param setIsStreaming Streaming state update function
 * @param setStreamingMessageId Streaming message ID update function
 * @param setIsSubmitting Submission state update function
 * @param isSubmittingRef Reference to submission state
 * @param streamingInProgress Reference to streaming progress state
 */
export const handleParallelDeepResearch = async (
  subQuestions: string[],
  originalQuery: string,
  modelId: string,
  assistantMessageId: string,
  providedChatId?: string | number,
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>,
  deepResearchInProgress?: React.MutableRefObject<Set<string>>,
  setIsStreaming?: React.Dispatch<React.SetStateAction<boolean>>,
  setStreamingMessageId?: React.Dispatch<React.SetStateAction<string | null>>,
  setIsSubmitting?: React.Dispatch<React.SetStateAction<boolean>>,
  isSubmittingRef?: React.MutableRefObject<boolean>,
  streamingInProgress?: React.MutableRefObject<boolean>
) => {
  // Validate required parameters
  if (!setMessages) return;
  
  // Load translations (chat module)
  const language = getStoredLanguage();
  const translations = await loadTranslationModule(language, 'chat');
  const lang = (key: string) => getTranslationKey(translations, key);
  
  // Validate chat ID - check early to avoid errors
  if (!providedChatId) {
    console.error(lang('deepResearch.errors.invalidChatId'));
    
    // Display error message in UI
    setMessages(prev => 
      prev.map(m => 
        m.id === assistantMessageId 
          ? { 
              ...m,
              content: m.content + `\n\n${lang('deepResearch.errors.parallelErrorOccurred')}: ${lang('deepResearch.errors.invalidChatId')}`,
              hasDeepResearchError: true
            }
          : m
      )
    );
    
    return; // Early return to avoid further processing
  }
  
  // Prevent duplicate processing
  if (deepResearchInProgress?.current.has(assistantMessageId)) {
    console.log('🔄 Parallel deep research already in progress:', assistantMessageId);
    return;
  }
  
  // Mark as in progress
  deepResearchInProgress?.current.add(assistantMessageId);
  
  try {
    // Process all sub-questions in parallel (includes timeout and retry logic)
    const subQuestionResults = await Promise.all(
      subQuestions.map(async (question, index) => {
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
            }, 90000); // 90 second timeout

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Analysis failed (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            
            // Update
            const stepKey = `subq_${index}_${Date.now()}`;
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { 
                      ...m,
                      deepResearchStepInfo: {
                        ...m.deepResearchStepInfo,
                        [stepKey]: {
                          title: `${lang('deepResearch.titles.analysisPrefix')}: ${question}`,
                          content: result.analysis?.analysis || result.analysis || lang('deepResearch.errors.analysisEmpty'),
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
              analysis: result.analysis?.analysis || result.analysis || lang('deepResearch.errors.analysisEmpty'),
              content: result.analysis?.analysis || result.analysis || lang('deepResearch.errors.analysisEmpty'),
              subQuestionId: question,
              originalQuestion: question,
              index: index
            };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // If not last attempt, wait and retry
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            // Update error state if all attempts fail
            const errorStepKey = `subq_${index}_error_${Date.now()}`;
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { 
                      ...m,
                      deepResearchStepInfo: {
                        ...m.deepResearchStepInfo,
                        [errorStepKey]: {
                          title: `${lang('deepResearch.titles.analysisPrefix')}: ${question}`,
                          content: lang('deepResearch.errors.analysisError')
                            .replace('{retries}', String(maxRetries))
                            .replace('{message}', lastError?.message || lang('deepResearch.errors.unknownError')),
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
            
            // Return null for partial failure (don't stop overall process)
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
      throw new Error(lang('deepResearch.errors.allSubAnalysesFailed'));
    }

    // Perform synthesis analysis (timeout and retry)
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
        }, 90000); // 90 second timeout

        if (!synthesisResponse.ok) {
          const errorText = await synthesisResponse.text();
          throw new Error(`Synthesis failed (${synthesisResponse.status}): ${errorText}`);
        }

        synthesisResult = await synthesisResponse.json();
        break; // End loop on success
      } catch (error) {
        synthesisLastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < synthesisMaxRetries) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw new Error(
            lang('deepResearch.errors.synthesisAttemptsFailed')
              .replace('{retries}', String(synthesisMaxRetries))
              .replace('{message}', synthesisLastError?.message || lang('deepResearch.errors.unknownError'))
          );
        }
      }
    }

    // Update synthesis analysis result
    const synthesisId = `synthesis_${Date.now()}`;
    setMessages(prev => 
      prev.map(m => 
        m.id === assistantMessageId 
          ? { 
              ...m,
              deepResearchStepInfo: {
                ...m.deepResearchStepInfo,
                [synthesisId]: {
                  title: lang('deepResearch.titles.synthesisAnalysis'),
                  content: synthesisResult.synthesis || lang('deepResearch.status.noContent'),
                  isComplete: true,
                  isSynthesis: true
                }
              }
            }
          : m
      )
    );

    // Create final answer (timeout and retry)
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
        }, 60000); // 60초 타임아웃

        if (!finalAnswerResponse.ok) {
          const errorText = await finalAnswerResponse.text();
          throw new Error(`Final answer generation failed (${finalAnswerResponse.status}): ${errorText}`);
        }

        finalAnswerResult = await finalAnswerResponse.json();
        break; // End loop on success
      } catch (error) {
        finalAnswerLastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < finalAnswerMaxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw new Error(
            lang('deepResearch.errors.finalAttemptsFailed')
              .replace('{retries}', String(finalAnswerMaxRetries))
              .replace('{message}', finalAnswerLastError?.message || lang('deepResearch.errors.unknownError'))
          );
        }
      }
    }

    // Update message with final answer
    const finalAnswerId = `final_answer_${Date.now()}`;
    const finalAnswerContent = finalAnswerResult.finalAnswer || finalAnswerResult.answer || lang('deepResearch.errors.finalAnswerNotGenerated');
    
    setMessages(prev => 
      prev.map(m => 
        m.id === assistantMessageId 
          ? { 
              ...m,
              // Replace content with final answer
              content: finalAnswerContent,
              isDeepResearchComplete: true,
              deepResearchStepType: 'final' as const,
              deepResearchStepInfo: {
                ...m.deepResearchStepInfo,
                [finalAnswerId]: {
                  title: lang('deepResearch.finalAnswer'),
                  content: '', // Final answer block is empty
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
      // Use providedChatId as fallback value
      const chatIdToUse = providedChatId;
      if (!chatIdToUse) {
        console.error('Chat ID is invalid. Skipping final answer save.');
        return; // Early return to avoid further processing
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
        throw new Error(`Final answer save failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to save final answer to database:', error);
    }

    // 스트리밍 상태 즉시 종료
    if (setIsStreaming) setIsStreaming(false);
    if (setStreamingMessageId) setStreamingMessageId(null);
    if (setIsSubmitting) setIsSubmitting(false);
    if (isSubmittingRef) isSubmittingRef.current = false;
    if (streamingInProgress) streamingInProgress.current = false;
    
    // 추가 안전 조치 - 여러 번 시도
    setTimeout(() => {
      if (setIsStreaming) setIsStreaming(false);
      if (setStreamingMessageId) setStreamingMessageId(null);
      if (setIsSubmitting) setIsSubmitting(false);
      if (isSubmittingRef) isSubmittingRef.current = false;
      if (streamingInProgress) streamingInProgress.current = false;
    }, 100);
    
    setTimeout(() => {
      if (setIsStreaming) setIsStreaming(false);
      if (setStreamingMessageId) setStreamingMessageId(null);
      if (setIsSubmitting) setIsSubmitting(false);
      if (isSubmittingRef) isSubmittingRef.current = false;
      if (streamingInProgress) streamingInProgress.current = false;
    }, 1000);

    // 딥 리서치 성공적으로 완료
    
  } catch (error) {
    console.error('Parallel deep research error:', error);
    
    // Handle error
    const errorContent = error instanceof Error ? error.message : 'Unknown error occurred.';
    setMessages(prev => 
      prev.map(m => 
        m.id === assistantMessageId 
          ? { 
              ...m,
              content: m.content + `\n\n${lang('deepResearch.errors.parallelErrorOccurred')}: ` + errorContent,
              hasDeepResearchError: true
            }
          : m
      )
    );
    
    // Clean up on error
    
    // Immediately stop streaming state
    if (setIsStreaming) setIsStreaming(false);
    if (setStreamingMessageId) setStreamingMessageId(null);
    if (setIsSubmitting) setIsSubmitting(false);
    if (isSubmittingRef) isSubmittingRef.current = false;
    if (streamingInProgress) streamingInProgress.current = false;
    
    // Additional safety measures
    setTimeout(() => {
      if (setIsStreaming) setIsStreaming(false);
      if (setStreamingMessageId) setStreamingMessageId(null);
      if (setIsSubmitting) setIsSubmitting(false);
      if (isSubmittingRef) isSubmittingRef.current = false;
      if (streamingInProgress) streamingInProgress.current = false;
    }, 100);
  } finally {
    // Clean up - remove from in-progress set
    deepResearchInProgress?.current.delete(assistantMessageId);
  }
}; 