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

// 언어 감지 함수
const detectLanguage = (code: string): string => {
  // JavaScript 패턴
  if (/(?:function|const|let|var|=>|console\.log|require\(|import\s+.*from)/.test(code)) {
    return 'javascript'
  }
  
  // TypeScript 패턴
  if (/(?:interface|type\s+\w+\s*=|as\s+\w+|:\s*\w+\s*[=;])/.test(code)) {
    return 'typescript'
  }
  
  // Python 패턴
  if (/(?:def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\(|if\s+__name__)/.test(code)) {
    return 'python'
  }
  
  // Java 패턴
  if (/(?:public\s+class|public\s+static\s+void|System\.out\.println)/.test(code)) {
    return 'java'
  }
  
  // C++ 패턴
  if (/(?:#include\s*<|std::|cout\s*<<|int\s+main\s*\()/.test(code)) {
    return 'cpp'
  }
  
  // HTML 패턴
  if (/(?:<\/?\w+[^>]*>|<!DOCTYPE)/.test(code)) {
    return 'html'
  }
  
  // CSS 패턴
  if (/(?:@media|@import|{\s*[\w-]+\s*:|\.[\w-]+\s*{)/.test(code)) {
    return 'css'
  }
  
  // SQL 패턴
  if (/(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/i.test(code)) {
    return 'sql'
  }
  
  // JSON 패턴
  if (/^\s*[{\[][\s\S]*[}\]]\s*$/.test(code)) {
    return 'json'
  }
  
  // YAML 패턴
  if (/(?:^---|\w+:\s*[\w\-]+$)/m.test(code)) {
    return 'yaml'
  }
  
     // Bash 패턴
   if (/(?:#!\/bin\/bash|ls\s+|cd\s+|mkdir\s+|grep\s+)/.test(code)) {
     return 'bash'
   }
  
  // PHP 패턴
  if (/(?:<\?php|\$\w+\s*=|function\s+\w+\s*\()/.test(code)) {
    return 'php'
  }
  
  // Go 패턴
  if (/(?:package\s+main|func\s+\w+|import\s*\()/.test(code)) {
    return 'go'
  }
  
  // Rust 패턴
  if (/(?:fn\s+\w+|let\s+mut|use\s+std::)/.test(code)) {
    return 'rust'
  }
  
  return 'text'
}

// 파일 확장자에서 언어 추출
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
  
  // 인라인 코드는 llm-response.tsx에서 처리하므로 여기서는 블록 코드만 처리
  if (inline) {
    return (
      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
        {code}
      </code>
    )
  }

  // 코드 블럭 클릭 시 포커스 및 Ctrl+A 전체 선택 기능
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a' && codeBlockRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        
        // 코드 내용을 클립보드에 복사하고 선택 표시
        try {
          navigator.clipboard.writeText(code)
          
          // 시각적 피드백을 위한 선택 효과
          const selection = window.getSelection()
          if (selection && codeContentRef.current) {
            const range = document.createRange()
            range.selectNodeContents(codeContentRef.current)
            selection.removeAllRanges()
            selection.addRange(range)
            
            // 잠시 후 선택 해제
            setTimeout(() => {
              if (selection) {
                selection.removeAllRanges()
              }
            }, 100)
          }
        } catch (err) {
          console.error('코드 복사 실패:', err)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [code])

  // 코드 블럭 클릭 시 포커스
  const handleCodeBlockClick = () => {
    if (codeBlockRef.current) {
      codeBlockRef.current.focus()
    }
  }
  
  // 언어 감지
  const explicitLanguage = getLanguageFromClassName(className || '')
  const detectedLanguage = explicitLanguage || detectLanguage(code)
  const displayLanguage = detectedLanguage === 'text' ? '텍스트' : detectedLanguage.toUpperCase()
  
  // 복사 기능
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }
  
  // 다운로드 기능
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
      className={`relative group my-4 not-prose w-full code-block focus:outline-none max-w-full ${isMobile ? 'mobile-code-block' : ''}`}
      tabIndex={0}
      onClick={handleCodeBlockClick}
    >
      {/* 헤더 */}
      <div 
        className="code-block-header flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600 px-2 sm:px-3"
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
        
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={handleCopy}
            className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation ${
              copied ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
            }`}
            title={copied ? '복사됨!' : '코드 복사'}
          >
            {copied ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
          </button>
          
          <button
            onClick={handleDownload}
            className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400 touch-manipulation"
            title="파일로 다운로드"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
      
      {/* 코드 영역 */}
      <div 
        ref={codeContentRef}
        className="relative rounded-b-lg bg-gray-50 dark:bg-gray-900 w-full overflow-auto" 
      >
        <SyntaxHighlighter
          language={detectedLanguage === 'text' ? 'plaintext' : detectedLanguage}
          style={theme === 'dark' ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: isMobile ? '0.75rem' : '0.75rem',
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            lineHeight: isMobile ? '1.5' : '1.4',
            background: 'transparent',
            overflow: 'auto',
            whiteSpace: isMobile ? 'pre-wrap' : 'pre',
            wordBreak: isMobile ? 'break-word' : 'normal',
            wordWrap: isMobile ? 'break-word' : 'normal',
            overflowWrap: isMobile ? 'break-word' : 'normal',
            maxWidth: '100%',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          lineNumberStyle={{
            fontStyle: 'normal !important',
            fontSize: isMobile ? '0.65rem' : '0.7rem',
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
          wrapLines={isMobile}
          wrapLongLines={isMobile}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
} 