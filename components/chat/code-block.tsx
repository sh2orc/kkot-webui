"use client"

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import { useTranslation } from '@/lib/i18n'
import { useIsMobile } from '@/hooks/use-mobile'

interface CodeBlockProps {
  children: string
  className?: string
  inline?: boolean
}

// Language detection function
const detectLanguage = (code: string): string => {
  // JavaScript pattern
  if (/(?:function|const|let|var|=>|console\.log|require\(|import\s+.*from)/.test(code)) {
    return 'javascript'
  }
  
  // TypeScript pattern
  if (/(?:interface|type\s+\w+\s*=|as\s+\w+|:\s*\w+\s*[=;])/.test(code)) {
    return 'typescript'
  }
  
  // Python pattern
  if (/(?:def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\(|if\s+__name__)/.test(code)) {
    return 'python'
  }
  
  // Java pattern
  if (/(?:public\s+class|public\s+static\s+void|System\.out\.println)/.test(code)) {
    return 'java'
  }
  
  // C++ pattern
  if (/(?:#include\s*<|std::|cout\s*<<|int\s+main\s*\()/.test(code)) {
    return 'cpp'
  }
  
  // HTML pattern
  if (/(?:<\/?\w+[^>]*>|<!DOCTYPE)/.test(code)) {
    return 'html'
  }
  
  // CSS pattern
  if (/(?:@media|@import|{\s*[\w-]+\s*:|\.[\w-]+\s*{)/.test(code)) {
    return 'css'
  }
  
  // SQL pattern
  if (/(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/i.test(code)) {
    return 'sql'
  }
  
  // JSON pattern
  if (/^\s*[{\[][\s\S]*[}\]]\s*$/.test(code)) {
    return 'json'
  }
  
  // YAML pattern
  if (/(?:^---|\w+:\s*[\w\-]+$)/m.test(code)) {
    return 'yaml'
  }
  
     // Bash pattern
   if (/(?:#!\/bin\/bash|ls\s+|cd\s+|mkdir\s+|grep\s+)/.test(code)) {
     return 'bash'
   }
  
  // PHP pattern
  if (/(?:<\?php|\$\w+\s*=|function\s+\w+\s*\()/.test(code)) {
    return 'php'
  }
  
  // Go pattern
  if (/(?:package\s+main|func\s+\w+|import\s*\()/.test(code)) {
    return 'go'
  }
  
  // Rust pattern
  if (/(?:fn\s+\w+|let\s+mut|use\s+std::)/.test(code)) {
    return 'rust'
  }
  
  return 'text'
}

// Extract language from file extension
const getLanguageFromClassName = (className: string): string => {
  const match = /language-(\w+)/.exec(className || '')
  return match ? match[1] : ''
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const { theme } = useTheme()
  const { lang } = useTranslation('chat')
  const isMobile = useIsMobile()
  const codeBlockRef = useRef<HTMLDivElement>(null)
  const codeContentRef = useRef<HTMLDivElement>(null)
  
  const code = String(children).replace(/\n$/, '')
  
  // Only handle block code here since inline code is handled in llm-response.tsx
  if (inline) {
    return (
      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
        {code}
      </code>
    )
  }

  // Code block click focus and Ctrl+A select functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a' && codeBlockRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        
        // Copy code content to clipboard and show selection
        try {
          navigator.clipboard.writeText(code)
          
          // Visual feedback for selection effect
          const selection = window.getSelection()
          if (selection && codeContentRef.current) {
            const range = document.createRange()
            range.selectNodeContents(codeContentRef.current)
            selection.removeAllRanges()
            selection.addRange(range)
            
            // Deselect after a short delay
            setTimeout(() => {
              if (selection) {
                selection.removeAllRanges()
              }
            }, 100)
          }
        } catch (err) {
          console.error('Failed to copy code:', err)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [code])

  // Focus code block on click
  const handleCodeBlockClick = () => {
    if (codeBlockRef.current) {
      codeBlockRef.current.focus()
    }
  }
  
  // Language detection
  const explicitLanguage = getLanguageFromClassName(className || '')
  const detectedLanguage = explicitLanguage || detectLanguage(code)
  const displayLanguage = detectedLanguage === 'text' ? 'Text' : detectedLanguage.toUpperCase()
  
  // Copy functionality
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }
  
  // Download functionality
  const handleDownload = () => {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      html: 'html',
      css: 'css',
      sql: 'sql',
      json: 'json',
      yaml: 'yml',
      bash: 'sh',
      php: 'php',
      go: 'go',
      rust: 'rs',
      kotlin: 'kt',
      swift: 'swift'
    }
    
    const extension = extensions[detectedLanguage] || 'txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
          <div 
        ref={codeBlockRef}
        className={`relative group my-4 not-prose code-block focus:outline-none 
          ${isMobile ? 'w-full max-w-[90%] mx-auto border border-gray-200 dark:border-gray-600' : 'w-full max-w-full'}`}
        tabIndex={0}
        onClick={handleCodeBlockClick}
      >
      {/* Header */}
      <div 
        className={`code-block-header flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700 ${isMobile ? '' : 'rounded-t-lg'} border-b border-gray-200 dark:border-gray-600 px-2 sm:px-3`}
        style={{ 
          fontSize: '0.8rem',
          minHeight: '36px'
        }}
      >
          <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
           <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium truncate">
             {displayLanguage}
           </span>
           <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
             {code.split('\n').length > 1 ? `(${code.split('\n').length} lines)` : ''}
           </span>
         </div>
        
        <div className="flex items-center sm:gap-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation ${
              copied ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
            }`}
            title={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? <Check className="h-3 w-3 sm:h-5 sm:w-5" /> : <Copy className="h-3 w-3 sm:h-5 sm:w-5" />}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center justify-center sm:p-3 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400 touch-manipulation"
            title="Download as file"
          >
            <Download className="h-3 w-3 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
      
      {/* Code area */}
      <div 
        ref={codeContentRef}
        className={`relative bg-gray-50 dark:bg-gray-900 w-full ${isMobile ? 'overflow-x-auto' : 'overflow-auto rounded-b-lg'}`}
        style={isMobile ? { maxWidth: '100%', overflowX: 'auto' } : {}}
      >
        <SyntaxHighlighter
          language={detectedLanguage === 'text' ? 'plaintext' : detectedLanguage}
          style={theme === 'dark' ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: isMobile ? '0.5rem' : '0.75rem',
            fontSize: '0.85rem',
            lineHeight: '1.4',
            background: 'transparent',
            overflow: isMobile ? 'auto' : 'auto',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            wordWrap: 'normal',
            overflowWrap: 'normal',
            maxWidth: isMobile ? 'calc(90vw - 2rem)' : '100%',
            width: isMobile ? 'calc(90vw - 2rem)' : '100%',
            fontFamily: 'Consolas, Noto Sans Mono, ui-monospace, SFMono-Regular, SF Mono, Monaco,  Liberation Mono, Courier New, monospace',
          }}
          className="code-block-syntax"
          lineNumberStyle={{
            fontStyle: 'normal !important',
            fontSize: '0.7rem',
            fontWeight: 'normal',
            minWidth: isMobile ? '1.5rem' : '2rem',
            paddingRight: '0.75rem',
            textAlign: 'right',
            userSelect: 'none',
            display: 'inline-block',
          }}
          PreTag="div"
          CodeTag="div"
          showLineNumbers={code.split('\n').length > 4 && !isMobile}
          wrapLines={false}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
} 