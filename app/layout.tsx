'use client'

import './globals.css'
import { useEffect } from 'react'
import LanguageProvider from '@/components/providers/language-provider'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  useEffect(() => {
    // 브라우저에서만 실행되는 코드
    document.title = 'kkot-webui'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'kkot-webui is an open-source UI project designed to provide a seamless user interface for interacting with large language models (LLMs). Built with Next.js, our goal is to make powerful AI services like OpenAI, Gemini, and Ollama easily accessible to everyone.')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = 'kkot-webui is an open-source UI project designed to provide a seamless user interface for interacting with large language models (LLMs). Built with Next.js, our goal is to make powerful AI services like OpenAI, Gemini, and Ollama easily accessible to everyone.'
      document.head.appendChild(meta)
    }

    // favicon 설정
    const existingFavicon = document.querySelector('link[rel="icon"]')
    if (existingFavicon) {
      existingFavicon.setAttribute('href', '/images/favicon.png')
    } else {
      const favicon = document.createElement('link')
      favicon.rel = 'icon'
      favicon.type = 'image/png'
      favicon.href = '/images/favicon.png'
      document.head.appendChild(favicon)
    }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
