"use client"

import React from "react"
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Check } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useState } from "react"
import { marked } from 'marked'
import { CodeBlock } from './code-block'
import { useIsMobile } from '@/hooks/use-mobile'

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
  const isMobile = useIsMobile()

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
      <div 
        className={`prose max-w-none text-sm dark:prose-invert ${isStreaming ? 'streaming-content' : ''}`} 
        style={{ 
          overflowWrap: 'break-word', 
          wordBreak: 'break-word',          
        }}
      >
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
