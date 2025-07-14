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
                                   content.includes('# 🧠 Deep Research Analysis Start') || 
                                   content.includes('## 📊 Research Overview') ||
                                   content.includes('## 🔍 Analysis Process') ||
                                   content.includes('Deep Research Methodology:') ||
                                   content.includes('# 🧠 딥리서치 분석 시작') || 
                                   content.includes('## 📊 연구 개요') ||
                                   content.includes('## 🔍 분석 과정') ||
                                   content.includes('딥리서치 방법론:')
                                 ))

  // Check if this contains deep research steps
  // Only detect from content if isDeepResearch is not explicitly set
  const hasDeepResearchSteps = !isDeepResearch && content.includes('### ') && (
    content.includes('Question Analysis') || 
    content.includes('Analysis:') ||
    content.includes('질문 분석') || 
    content.includes('분석:') ||
    content.includes('### ')
  )

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
