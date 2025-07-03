import './globals.css'
import ClientProviders from '@/components/providers/client-providers'
import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'KKOT WebUI',
  description: 'Universal web interface for various LLM services',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
