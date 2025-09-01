import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/providers/client-providers'
import GlobalLayout from '@/components/layout/global-layout'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KKOT WebUI',
  description: 'Advanced AI Chat Interface',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientProviders>
          <GlobalLayout>
            {children}
          </GlobalLayout>
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  )
}