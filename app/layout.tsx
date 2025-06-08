import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'kkot-webui',
  description: 'kkot-webui is an open-source UI project designed to provide a seamless user interface for interacting with large language models (LLMs). Built with Next.js, our goal is to make powerful AI services like OpenAI, Gemini, and Ollama easily accessible to everyone. We aim to help more people experience and benefit from AI by offering an intuitive and user-friendly web interface.',
  generator: 'Taeyoung Lee',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
