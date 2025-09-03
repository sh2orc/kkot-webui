import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/providers/client-providers'
import GlobalLayout from '@/components/layout/global-layout'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

// Remove static metadata to allow dynamic title changes
// Title is now managed by BrandingProvider

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