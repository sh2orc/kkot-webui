"use client"

import React from "react"
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Check, Brain, Search } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useState } from "react"
import { marked } from 'marked'
import { CodeBlock } from './code-block'
import { useIsMobile } from '@/hooks/use-mobile'
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
  deepResearchStepInfo,
}: LlmResponseProps) {
  const [thumbsUpHover, setThumbsUpHover] = useState(false)
  const [thumbsUpClick, setThumbsUpClick] = useState(false)
  const [thumbsDownHover, setThumbsDownHover] = useState(false)
  const { lang } = useTranslation('chat')
  const isMobile = useIsMobile()

  // Check if this is a deep research response
  // If isDeepResearch is explicitly provided, use that value
  // Otherwise, fallback to content-based detection
  const isDeepResearchResponse = isDeepResearch || 
                                 (!isDeepResearch && (
                                   content.includes('# 🧠 딥리서치 분석 시작') || 
                                   content.includes('## 📊 연구 개요') ||
                                   content.includes('## 🔍 분석 과정') ||
                                   content.includes('딥리서치 방법론:')
                                 ))

  // Check if this contains deep research steps
  // Only detect from content if isDeepResearch is not explicitly set
  const hasDeepResearchSteps = !isDeepResearch && content.includes('### ') && (
    content.includes('질문 분석') || 
    content.includes('분석:') ||
    content.includes('### ')
  )

  // Get current step type for streaming indication
  const getStepTypeLabel = (stepType?: string) => {
    switch (stepType) {
      case 'step': return '분석 중'
      case 'synthesis': return '종합 분석'
      case 'final': return '최종 답변'
      default: return '진행 중'
    }
  }

  // MarkedMarkdown component definition
  function MarkedMarkdown({ children }: { children: string }) {
    // First handle inline code in original text
    let processedText = children;
    
    // Convert all text surrounded by backticks to <code> tags
    processedText = processedText.replace(/`([^`\n]+)`/g, '<span class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono font-semibold">$1</span>');
    
    // Convert **text** pattern to <span class="font-semibold"> tag
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold">$1</span>');

    // Convert unconverted *text* pattern to <em> tag (excluding those already converted with **)
    processedText = processedText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<span>$1</span>');
   
    // Now process remaining markdown with marked
    let htmlContent = marked(processedText, { 
      gfm: true, 
      breaks: true
    }) as string;
       
    return (
      <div
        className="prose max-w-none dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:font-bold prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded dark:prose-code:bg-gray-800"
        style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
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

  const contentParts = parseContent(content);

  return (
    <div className="leading-[1.7]">
      {/* Deep Research Badge - Only show for non-structured deep research */}
      {(isDeepResearchResponse || hasDeepResearchSteps) && !isDeepResearch && (
        <div className="mb-3 flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-full text-xs font-medium text-cyan-700">
            <Brain className="w-3.5 h-3.5" />
            <span>
              {isDeepResearchComplete ? '딥리서치 완료' : 
               isStreaming ? `딥리서치 ${getStepTypeLabel(deepResearchStepType)}` : 
               '딥리서치 분석 결과'}
            </span>
          </div>
          {hasDeepResearchSteps && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
              <Search className="w-3 h-3" />
              <span>다단계 분석</span>
            </div>
          )}
          {hasDeepResearchError && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
              <span>⚠️ 오류 발생</span>
            </div>
          )}
          {isStreaming && isDeepResearch && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>실시간 분석</span>
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
        {/* Deep Research Display */}
        {isDeepResearchResponse ? (
          <div>
            <DeepResearchDisplay 
              content={content}
              isStreaming={isStreaming}
              deepResearchStepType={deepResearchStepType}
              isDeepResearchComplete={isDeepResearchComplete}
              deepResearchStepInfo={deepResearchStepInfo}
            />
            {/* 최종답변 내용 표시 */}
            {content && content.trim() && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">최종 답변</span>
                </div>
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
        

        <div className="text-xs text-gray-400 mt-1">
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
            return displayTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          })()}
        </div>
        <div className="flex mt-2">
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
                likedMessages.has(id) ? "fill-current text-blue-500" : "text-gray-500"
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
                dislikedMessages.has(id) ? "fill-current text-red-500" : "text-gray-500"
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
