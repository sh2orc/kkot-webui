"use client"

import React, { useRef, useState } from "react"
import { Copy, Clipboard, FileCode, ThumbsUp, ThumbsDown, Check, Brain, Search } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { CodeBlock } from './code-block'
import { useIsMobile } from '@/hooks/use-mobile'
import { useTimezone } from '@/components/providers/timezone-provider'
import { DeepResearchDisplay } from './deep-research-display'

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
  isDeepResearch?: boolean
  deepResearchStepType?: 'step' | 'synthesis' | 'final'
  isDeepResearchComplete?: boolean
  hasDeepResearchError?: boolean
  isDeepResearchAborted?: boolean
  deepResearchStepInfo?: {
    title?: string
    isComplete?: boolean
    totalSteps?: number
    plannedSteps?: Array<{ title: string, type: string }>
    currentStepContent?: string
    currentStepType?: string
  }
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
  isDeepResearch = false,
  deepResearchStepType,
  isDeepResearchComplete = false,
  hasDeepResearchError = false,
  isDeepResearchAborted = false,
  deepResearchStepInfo,
}: LlmResponseProps) {
  const [thumbsUpHover, setThumbsUpHover] = useState(false)
  const [thumbsUpClick, setThumbsUpClick] = useState(false)
  const [thumbsDownHover, setThumbsDownHover] = useState(false)
  const [copiedRendered, setCopiedRendered] = useState(false)
  const { lang } = useTranslation('chat')
  const isMobile = useIsMobile()
  const { formatTime } = useTimezone()
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Check if this is an image generation/editing loading message
  const isImageGenerationLoading = content.includes('🎨 이미지를 생성하고 있습니다...');
  const isImageEditingLoading = content.includes('🎨 이미지를 편집하고 있습니다...');
  const isImageProcessingLoading = isImageGenerationLoading || isImageEditingLoading;
  
  if (isImageProcessingLoading) {
    const loadingText = isImageEditingLoading ? '이미지를 편집하고 있습니다...' : '이미지를 생성하고 있습니다...';
    
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
        <span className="text-blue-700 dark:text-blue-300 font-medium">{loadingText}</span>
      </div>
    );
  }

  // Check if this is a deep research response
  // ONLY use explicit isDeepResearch flag - don't rely on content detection
  const isDeepResearchResponse = isDeepResearch === true

  // Check if this contains deep research steps  
  // ONLY rely on explicit isDeepResearch flag
  const hasDeepResearchSteps = false // Disable problematic content-based detection

  // Get current step type for streaming indication
  const getStepTypeLabel = (stepType?: string) => {
    switch (stepType) {
      case 'step': return 'Analyzing'
      case 'synthesis': return 'Synthesizing'
      case 'final': return 'Final Answer'
      default: return 'In Progress'
    }
  }

  // MarkedMarkdown component definition
  function MarkedMarkdown({ children }: { children: string }) {
    // Keep original markdown; only normalize MathJax-style delimiters
    let processedText = children;

    // Support MathJax-style delimiters by converting to remark-math compatible ones
    // \( inline \) -> $ inline $
    // \[ block \] -> $$ block $$
    // 1) Convert MathJax-style block delimiters to $$ with enforced blank lines
    processedText = processedText
      .replace(/(^|\n)\s*\\\[\s*/g, '$1\n\n$$\n')
      .replace(/\s*\\\]\s*(?=\n|$)/g, '\n$$\n\n');

    // 2) Ensure any $$ ... $$ blocks are surrounded by blank lines (idempotent)
    processedText = processedText.replace(/(^|\n)\s*\$\$\s*([\s\S]*?)\s*\$\$\s*(?=\n|$)/g, (_m, pre, inner) => {
      return `${pre}\n\n$$\n${inner.trim()}\n$$\n\n`;
    });

    // 3) Convert inline MathJax \( ... \) to $ ... $
    processedText = processedText
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');
   
    // Prefer ReactMarkdown pipeline with remark-math/rehype-katex for robust math rendering
    return (
      <div className="prose max-w-none dark:prose-invert prose-headings:font-semibold prose-p:my-5 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:font-bold prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // Ensure block math paragraphs become divs with proper spacing
            p: ({ node, children, ...props }: any) => {
              const childArray = React.Children.toArray(children);
              if (childArray.length === 1) {
                const onlyChild: any = childArray[0] as any;
                if (
                  React.isValidElement(onlyChild) &&
                  typeof (onlyChild as any).props?.className === 'string' &&
                  (onlyChild as any).props.className.includes('katex-display')
                ) {
                  return (
                    <div className="my-4 flex justify-center" {...props}>
                      {onlyChild}
                    </div>
                  );
                }
              }
              return <p {...props}>{children}</p>;
            },
            // Handle broken images gracefully
            img: ({ node, src, alt, ...props }: any) => {
              const [hasError, setHasError] = useState(false);
              const [isLoading, setIsLoading] = useState(true);
              const [retryCount, setRetryCount] = useState(0);
              
              // Check if src is empty or undefined
              if (!src || src.trim() === '') {
                return (
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-yellow-500">⚠️</span>
                    <span>[이미지 URL 없음]</span>
                    {alt && <span className="text-xs">({alt})</span>}
                  </span>
                );
              }
              
              // Check if this is a potentially expired DALL-E URL
              const isExpiredDalleUrl = src?.includes('oaidalleapiprodscus.blob.core.windows.net') || src?.includes('blob.core.windows.net');
              const isExpired = isExpiredDalleUrl && (src?.includes('st=2024-') || src?.includes('se=2024-'));
              
              if (hasError || isExpired) {
                return (
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500">🖼️</span>
                    <span>{isExpired ? '[만료된 이미지]' : '[이미지 로딩 실패]'}</span>
                    {alt && <span className="text-xs">({alt})</span>}
                  </span>
                );
              }
              
              // Convert old /temp-images/ URLs to new /api/images/ format
              const convertedSrc = src.startsWith('/temp-images/') 
                ? src.replace('/temp-images/', '/api/images/')
                : src;
              
              return (
                <>
                <span className="relative inline-block">
                  <img
                    {...props}
                    src={convertedSrc}
                    alt={alt}
                    className="max-w-[50%] h-auto rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    onLoad={() => setIsLoading(false)}
                    onError={(e: any) => {
                      console.error('Image load error:', convertedSrc, 'Retry count:', retryCount);
                      
                      // Retry loading the image up to 3 times
                      if (retryCount < 3) {
                        setTimeout(() => {
                          setRetryCount(prev => prev + 1);
                          // Force reload by appending timestamp
                          const img = e.target as HTMLImageElement;
                          const url = new URL(img.src, window.location.origin);
                          url.searchParams.set('retry', String(Date.now()));
                          img.src = url.toString();
                        }, 1000 * (retryCount + 1)); // Exponential backoff
                      } else {
                        setHasError(true);
                        setIsLoading(false);
                      }
                    }}
                    onClick={() => {
                      // Create modal overlay
                      const overlay = document.createElement('div');
                      overlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 cursor-pointer';
                      overlay.style.backdropFilter = 'blur(4px)';
                      
                      // Create full-size image
                      const fullImg = document.createElement('img');
                      fullImg.src = convertedSrc;
                      fullImg.alt = alt || 'Generated Image';
                      fullImg.className = 'max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl';
                      fullImg.style.cursor = 'pointer';
                      
                      // Add click to close
                      overlay.addEventListener('click', () => {
                        document.body.removeChild(overlay);
                        document.body.style.overflow = 'auto';
                      });
                      
                      // Prevent image click from closing modal
                      fullImg.addEventListener('click', (e) => {
                        e.stopPropagation();
                      });
                      
                      overlay.appendChild(fullImg);
                      document.body.appendChild(overlay);
                      document.body.style.overflow = 'hidden';
                      
                      // Add escape key to close
                      const handleEscape = (e: KeyboardEvent) => {
                        if (e.key === 'Escape') {
                          document.body.removeChild(overlay);
                          document.body.style.overflow = 'auto';
                          document.removeEventListener('keydown', handleEscape);
                        }
                      };
                      document.addEventListener('keydown', handleEscape);
                    }}
                    style={{ 
                      opacity: isLoading ? 0 : 1,
                      transition: 'opacity 0.3s ease-in-out'
                    }}
                  />
                  {isLoading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="animate-spin">⏳</span>
                        <span>이미지 로딩 중{retryCount > 0 && ` (재시도 ${retryCount}/3)`}...</span>
                      </span>
                    </span>
                  )}
                  {/* Overlay hint */}
                  <span className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    클릭하여 확대
                  </span>
                </span>
                </>
              );
            },
          }}
        >
          {processedText}
        </ReactMarkdown>
      </div>
    );
  }

  const handleLikeClick = () => {
    onLike(id)
    setThumbsUpClick(true)
    setTimeout(() => setThumbsUpClick(false), 500)
  }

  // Function to separate and process code blocks
  const parseContent = (text: string) => {
    const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
    
    // Process code blocks even during streaming
    if (isStreaming) {
      // Find all positions of triple backticks to check for last open block
      const allCodeBlockMatches = [...text.matchAll(/```/g)];
      
      // If odd number of triple backticks, last one is an open block
      if (allCodeBlockMatches.length % 2 === 1) {
        const lastOpenIndex = allCodeBlockMatches[allCodeBlockMatches.length - 1].index!;
        
        // Add text before code block if exists
        if (lastOpenIndex > 0) {
          parts.push({
            type: 'text',
            content: text.slice(0, lastOpenIndex)
          });
        }
        
        // Process text after code block start
        const codeBlockText = text.slice(lastOpenIndex + 3);
        
        // Extract language identifier (text before first newline)
        const firstLineBreak = codeBlockText.indexOf('\n');
        let lang = 'text';
        let codeContent = codeBlockText;
        
        if (firstLineBreak !== -1) {
          const potentialLang = codeBlockText.slice(0, firstLineBreak).trim();
          if (potentialLang && !/\s/.test(potentialLang)) {
            lang = potentialLang;
            codeContent = codeBlockText.slice(firstLineBreak + 1);
          }
        }
        
        // Add code block
        parts.push({
          type: 'code',
          content: codeContent,
          lang
        });
        
        return parts;
      }
    }
    
    // Process with existing method if not streaming or if complete code block exists
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        content: match[2].trim(),
        lang: match[1] || 'text'
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add last text part
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    // Process entire text if array is empty
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: text
      });
    }
    
    return parts;
  };

  // Function to extract only the final answer
  const extractFinalAnswer = (text: string): string => {
    console.log('🔍 Extracting final answer from text:', text.length, 'characters');
    console.log('🔍 Text preview:', text.substring(0, 200));
    
    // 1. First try to find and extract #[final answer]# marker
    const finalAnswerMarker = '#[final answer]#';
    const markerIndex = text.indexOf(finalAnswerMarker);
    
    if (markerIndex !== -1) {
      // Extract content after marker
      const afterMarker = text.substring(markerIndex + finalAnswerMarker.length).trim();
      console.log('🔍 Found final answer marker, extracted:', afterMarker.substring(0, 100));
      return afterMarker;
    }
    
    // 2. Look for "## Final Answer" pattern (commonly used in parallel deep research)
    const finalAnswerSectionMatch = text.match(/## Final Answer\s*\n\n([\s\S]*?)$/);
    if (finalAnswerSectionMatch && finalAnswerSectionMatch[1]) {
      console.log('🔍 Found "## Final Answer" section, extracted:', finalAnswerSectionMatch[1].substring(0, 100));
      return finalAnswerSectionMatch[1].trim();
    }
    
    // 3. Various patterns used in parallel deep research
    const finalAnswerPatterns = [
      // Parallel deep research specific patterns
      /## Final Answer\s*\n([\s\S]*?)$/,
      /### Final Answer\s*\n([\s\S]*?)$/,
      /## Core Answer\s*\n([\s\S]*?)$/,
      /### Core Answer\s*\n([\s\S]*?)$/,
      /## Core Answer\s*\n([\s\S]*?)$/,
      /### Core Answer\s*\n([\s\S]*?)$/,
      
      // English patterns
      /## 🎯 Final Answer\s*\n([\s\S]*?)(?=\n## |$)/,
      /### 🎯 Final Answer\s*\n([\s\S]*?)(?=\n### |$)/,
      /# 🎯 Final Answer\s*\n([\s\S]*?)(?=\n# |$)/,
      /## Final Answer\s*\n([\s\S]*?)(?=\n## |$)/,
      /### Final Answer\s*\n([\s\S]*?)(?=\n### |$)/,
      /# Final Answer\s*\n([\s\S]*?)(?=\n# |$)/,
      /## Conclusion\s*\n([\s\S]*?)(?=\n## |$)/,
      /### Conclusion\s*\n([\s\S]*?)(?=\n### |$)/,
      
      // English patterns with numbers
      /### 1\. Core Answer\s*\n([\s\S]*?)$/,
      /### \d+\. Core Answer\s*\n([\s\S]*?)$/,
      /## 1\. Core Answer\s*\n([\s\S]*?)$/,
      /## \d+\. Core Answer\s*\n([\s\S]*?)$/,
      
      // Korean patterns (fallback)
      /## 🎯 최종 답변\s*\n([\s\S]*?)(?=\n## |$)/,
      /### 🎯 최종 답변\s*\n([\s\S]*?)(?=\n### |$)/,
      /# 🎯 최종 답변\s*\n([\s\S]*?)(?=\n# |$)/,
      /## 📝 종합 결론\s*\n([\s\S]*?)(?=\n## |$)/,
      /### 📝 종합 결론\s*\n([\s\S]*?)(?=\n### |$)/,
      /# 최종 답변\s*\n([\s\S]*?)(?=\n# |$)/,
      /## 결론\s*\n([\s\S]*?)(?=\n## |$)/,
      /### 결론\s*\n([\s\S]*?)(?=\n### |$)/,
      /### 1\. 핵심 답변\s*\n([\s\S]*?)(?=\n최종 답변이 구조적으로|$)/,
      /### \d+\. 핵심 답변\s*\n([\s\S]*?)(?=\n최종 답변이 구조적으로|$)/,
      /## 1\. 핵심 답변\s*\n([\s\S]*?)(?=\n최종 답변이 구조적으로|$)/,
      /## \d+\. 핵심 답변\s*\n([\s\S]*?)(?=\n최종 답변이 구조적으로|$)/,
      
      // Separator patterns
      /--- Final Answer ---\s*\n([\s\S]*?)(?=\n--- |$)/,
      /=== Final Answer ===\s*\n([\s\S]*?)(?=\n=== |$)/,
      /--- 최종 답변 ---\s*\n([\s\S]*?)(?=\n--- |$)/,
      /=== 최종 답변 ===\s*\n([\s\S]*?)(?=\n=== |$)/,
    ];
    
    for (const pattern of finalAnswerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        console.log('🔍 Found pattern match:', pattern, 'extracted:', match[1].substring(0, 100));
        return match[1].trim();
      }
    }
    
    // 4. Special case: Find English and Korean "Core Answer" patterns
    const coreAnswerPatterns = [
      /### 1\. Core Answer([\s\S]*?)$/,
      /### 1\. Core Answer([\s\S]*?)(?=\n.*|$)/,
    ];
    
    for (const pattern of coreAnswerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        console.log('🔍 Found core answer pattern:', pattern);
        return `### 1. Core Answer${match[1]}`.trim();
      }
    }
    
    // 5. Find content after "Analysis Process and Additional Explanations" in parallel deep research
    const analysisProcessIndex = text.indexOf('Analysis Process and Additional Explanations');
    if (analysisProcessIndex !== -1) {
      // Find content after "Analysis Process and Additional Explanations"
      const afterAnalysisProcess = text.substring(analysisProcessIndex);
      
      // Find content after first markdown header (##)
      const firstHeaderMatch = afterAnalysisProcess.match(/## ([^\n]+)\s*\n([\s\S]*?)$/);
      if (firstHeaderMatch && firstHeaderMatch[2] && firstHeaderMatch[2].trim().length > 50) {
        console.log('🔍 Found content after "Analysis Process and Additional Explanations":', firstHeaderMatch[0].substring(0, 100));
        return firstHeaderMatch[0].trim();
      }
      
      // If no header found, get content after newline
      const contentAfterNewline = afterAnalysisProcess.substring(afterAnalysisProcess.indexOf('\n') + 1).trim();
      if (contentAfterNewline.length > 50) {
        console.log('🔍 Found content after analysis process (no header):', contentAfterNewline.substring(0, 100));
        return contentAfterNewline;
      }
    }
    
    // 6. If no pattern found, consider last section as final answer
    const sections = text.split(/\n(?=##? )/);
    if (sections.length > 1) {
      const lastSection = sections[sections.length - 1].replace(/^##? [^\n]*\n?/, '').trim();
      // If last section is too short, return last part of full text
      if (lastSection.length < 100) {
        const fallback = text.split('### 1. Core Answer').slice(-1)[0] || 
                        text.split('### 1. Core Answer').slice(-1)[0] || 
                        text;
        console.log('🔍 Using fallback pattern:', fallback.substring(0, 100));
        return fallback;
      }
      console.log('🔍 Using last section:', lastSection.substring(0, 100));
      return lastSection;
    }
    
    console.log('🔍 No pattern found, returning full text');
    return text;
  };

  const contentParts = parseContent(content);

  // Debug logging for deep research final answer
  console.log('🔍 LlmResponse render:', {
    id,
    contentLength: content.length,
    contentPreview: content.substring(0, 100),
    isDeepResearch,
    deepResearchStepType,
    isDeepResearchComplete,
    isStreaming
  });

  return (
    <div className="leading-[1.7]">
      {/* Deep Research Badge - Only show for non-structured deep research */}
      {(isDeepResearchResponse || hasDeepResearchSteps) && !isDeepResearch && (
        <div className="mb-3 flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-full text-xs font-medium text-cyan-700">
            <Brain className="w-3.5 h-3.5" />
            <span>
              {isDeepResearchComplete ? 'Deep Research Complete' : 
               isStreaming ? `Deep Research ${getStepTypeLabel(deepResearchStepType)}` : 
               'Deep Research Results'}
            </span>
          </div>
          {hasDeepResearchSteps && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
              <Search className="w-3 h-3" />
              <span>Multi-step Analysis</span>
            </div>
          )}
          {hasDeepResearchError && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
              <span>⚠️ Error Occurred</span>
            </div>
          )}

          {isStreaming && isDeepResearch && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Live Analysis</span>
            </div>
          )}
        </div>
      )}

      <div 
        className={`prose max-w-none text-sm dark:prose-invert ${isStreaming ? 'streaming-content' : ''} ${
          isDeepResearchResponse ? 'deep-research-content' : ''
        }`} 
        style={{ 
          overflowWrap: 'break-word', 
          wordBreak: 'break-word',          
        }}
      >
        <div ref={contentRef}>
        {/* Deep Research Display */}
        {isDeepResearchResponse ? (
          <div>
            <DeepResearchDisplay 
              key={`deep-research-${id}-${deepResearchStepInfo?.plannedSteps?.length || 0}-${deepResearchStepInfo?.plannedSteps?.map(s => s.title).join('|').substring(0, 50) || 'empty'}`}
              messageId={id}
              content={deepResearchStepType === 'final' ? '' : content}
              isStreaming={isStreaming}
              deepResearchStepType={deepResearchStepType}
              isDeepResearchComplete={isDeepResearchComplete}
              deepResearchStepInfo={deepResearchStepInfo}
            />

            {/* Display final answer as markdown when deep research is complete */}
            {isDeepResearchComplete && deepResearchStepType === 'final' && content && (
              <div className="markdown-content mt-4">
                {contentParts.map((part, index) => (
                  <div key={index}>
                    {part.type === 'text' ? (
                      <MarkedMarkdown>{part.content}</MarkedMarkdown>
                    ) : (
                      <CodeBlock
                        className={`language-${part.lang || 'text'}`}
                        inline={false}
                      >
                        {part.content}
                      </CodeBlock>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Regular Content Display */
          <div className="markdown-content">
            {contentParts.map((part, index) => (
              <div key={index}>
                {part.type === 'text' ? (
                  <MarkedMarkdown>{part.content}</MarkedMarkdown>
                ) : (
                  <CodeBlock
                    className={`language-${part.lang || 'text'}`}
                    inline={false}
                  >
                    {part.content}
                  </CodeBlock>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
        
        {/* Show abort message above timestamp */}
        {isDeepResearchAborted && (
          <div className="text-xs text-orange-600 mt-2 mb-1 flex items-center gap-1">
            <span>⏹️</span>
            <span>Analysis was interrupted</span>
          </div>
        )}

        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
        <div className="flex mt-2">
          <button
            onClick={async () => {
              try {
                const node = contentRef.current
                if (!node) return

                // Clone and clean KaTeX: remove accessibility MathML to avoid duplicated text,
                // but keep the rendered HTML branch as-is so formatting is preserved on paste.
                const cleaned = node.cloneNode(true) as HTMLElement

                // Prefer MathML for portability: replace each .katex with its MathML child
                cleaned.querySelectorAll('.katex').forEach((el) => {
                  const mathml = el.querySelector('.katex-mathml')
                  if (mathml) {
                    const clone = mathml.cloneNode(true)
                    el.replaceWith(clone)
                  } else {
                    // If MathML not present, at least remove .katex-html to prevent duplicate text
                    const htmlEl = el.querySelector('.katex-html')
                    if (htmlEl) htmlEl.remove()
                  }
                })

                const html = cleaned.innerHTML
                const text = cleaned.textContent || ''
                const ClipboardItemAny = (window as any).ClipboardItem
                if (navigator.clipboard && ClipboardItemAny) {
                  const item = new ClipboardItemAny({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([text], { type: 'text/plain' }),
                  })
                  await navigator.clipboard.write([item])
                } else {
                  // Create a temporary container with cleaned HTML to avoid KaTeX duplication
                  const temp = document.createElement('div')
                  temp.style.position = 'fixed'
                  temp.style.left = '-9999px'
                  temp.style.top = '0'
                  temp.style.whiteSpace = 'pre-wrap'
                  temp.innerHTML = html
                  document.body.appendChild(temp)

                  const selection = window.getSelection()
                  if (!selection) throw new Error('No selection available')
                  const range = document.createRange()
                  range.selectNodeContents(temp)
                  selection.removeAllRanges()
                  selection.addRange(range)
                  const ok = document.execCommand('copy')
                  selection.removeAllRanges()
                  document.body.removeChild(temp)
                  if (!ok) throw new Error('execCommand copy failed')
                }
                setCopiedRendered(true)
                setTimeout(() => setCopiedRendered(false), 2000)
              } catch (err) {
                console.error('Failed to copy formatted content:', err)
              }
            }}
            className={`p-1 rounded-full transition-all duration-200 ${
              copiedRendered ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
            title={copiedRendered ? lang('actions.copied') : lang('actions.copyFormatted')}
          >
            {copiedRendered ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onCopy(content, id)}
            className={`ml-1 p-1 rounded-full transition-all duration-200 ${
              copiedMessageId === id ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
            title={copiedMessageId === id ? lang('actions.copied') : lang('actions.copy')}
          >
            {copiedMessageId === id ? <Check className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLikeClick}
            onMouseEnter={() => setThumbsUpHover(true)}
            onMouseLeave={() => setThumbsUpHover(false)}
            className={`p-1 rounded-full transition-all duration-200 ${
              likedMessages.has(id) ? "scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            title={lang('actions.like')}
          >
            <ThumbsUp
              className={`h-4 w-4 transition-transform duration-200 ${
                likedMessages.has(id) ? "fill-current text-blue-500 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
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
              dislikedMessages.has(id) ? "scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            title={lang('actions.dislike')}
          >
            <ThumbsDown
              className={`h-4 w-4 transition-transform duration-200 ${
                dislikedMessages.has(id) ? "fill-current text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
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
