"use client"

import React from "react"
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Check } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useState } from "react"
import { marked } from 'marked'
import { CodeBlock } from './code-block'

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
}: LlmResponseProps) {
  const [thumbsUpHover, setThumbsUpHover] = useState(false)
  const [thumbsUpClick, setThumbsUpClick] = useState(false)
  const [thumbsDownHover, setThumbsDownHover] = useState(false)
  const { lang } = useTranslation('chat')

  // 마크다운 전처리 함수
  function preprocessMarkdown(text: string): string {
    // 마크다운 구문 내부의 따옴표는 보호하고, 나머지만 변환
    let processedText = text;
    
    // 볼드 마크다운 구문 내부의 한국어 따옴표는 그대로 유지
    // **"텍스트"** 패턴을 찾아서 임시로 보호
    const boldQuotePattern = /\*\*([^*]*[""'][^*]*)\*\*/g;
    const protectedSegments: string[] = [];
    let segmentIndex = 0;
    
    // 볼드 구문 내부의 따옴표를 임시로 보호
    processedText = processedText.replace(boldQuotePattern, (match, content) => {
      const placeholder = `__PROTECTED_SEGMENT_${segmentIndex}__`;
      protectedSegments[segmentIndex] = match;
      segmentIndex++;
      return placeholder;
    });
    
    // 이탤릭 마크다운 구문 내부의 한국어 따옴표도 보호
    const italicQuotePattern = /\*([^*]*[""'][^*]*)\*/g;
    processedText = processedText.replace(italicQuotePattern, (match, content) => {
      const placeholder = `__PROTECTED_SEGMENT_${segmentIndex}__`;
      protectedSegments[segmentIndex] = match;
      segmentIndex++;
      return placeholder;
    });
    
    // 일반 텍스트의 한국어 따옴표를 영어 따옴표로 변환
    processedText = processedText
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/…/g, '...')
      .replace(/—/g, '--')
      .replace(/–/g, '-');
    
    // 보호된 세그먼트를 원래대로 복원
    protectedSegments.forEach((segment, index) => {
      processedText = processedText.replace(`__PROTECTED_SEGMENT_${index}__`, segment);
    });
    
    return processedText;
  }

  // MarkedMarkdown 컴포넌트 정의
  function MarkedMarkdown({ children }: { children: string }) {
    // 먼저 원본 텍스트에서 직접 인라인 코드 처리
    let processedText = children;
    
    // 백틱으로 둘러싸인 모든 텍스트를 <code> 태그로 변환
    processedText = processedText.replace(/`([^`\n]+)`/g, '<span class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono font-semibold">$1</span>');
    
    // 이제 marked로 나머지 마크다운 처리
    let htmlContent = marked(processedText, { 
      gfm: true, 
      breaks: true
    }) as string;
    
    // 변환되지 않은 **텍스트** 패턴을 <strong>태그로 변환
    htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 변환되지 않은 *텍스트* 패턴을 <em>태그로 변환 (이미 **로 변환된 것은 제외)
    htmlContent = htmlContent.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    
    return (
      <div
        className="prose max-w-none dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:font-bold prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm dark:prose-code:bg-gray-800"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  const handleLikeClick = () => {
    onLike(id)
    setThumbsUpClick(true)
    setTimeout(() => setThumbsUpClick(false), 500)
  }

  // 코드 블록을 분리해서 처리하는 함수
  const parseContent = (text: string) => {
    const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
    // 코드 블록 정규식 - 언어 지정이 없는 경우도 처리
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // 코드 블록 이전의 텍스트 추가
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // 코드 블록 추가 (언어가 없으면 'text'로 기본값 설정)
      parts.push({
        type: 'code',
        content: match[2].trim(),
        lang: match[1] || 'text'
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 마지막 텍스트 부분 추가
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    // 빈 배열이면 전체를 텍스트로 처리
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
      <div className={`prose max-w-none dark:prose-invert ${isStreaming ? 'streaming-content' : ''}`}>
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
        

        <div className="text-xs text-gray-400 mt-1">
          {(timestamp instanceof Date ? timestamp : new Date(timestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex gap-1 mt-2">
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
                likedMessages.has(id) ? "fill-current text-blue-600" : "text-gray-500"
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
                dislikedMessages.has(id) ? "fill-current text-red-600" : "text-gray-500"
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
