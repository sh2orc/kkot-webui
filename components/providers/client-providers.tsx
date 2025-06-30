'use client'

import { ReactNode, Suspense } from 'react'
import { SessionProvider } from 'next-auth/react'
import { BrandingProvider } from './branding-provider'
import LanguageProvider from './language-provider'
import { ModelProvider } from './model-provider'
import { Toaster } from '@/components/ui/toaster'

// Basic Loading UI Component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
)

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchOnWindowFocus={false}
    >
      <Suspense fallback={<LoadingFallback />}>
        <BrandingProvider>
          <Suspense fallback={<LoadingFallback />}>
            <LanguageProvider>
              <ModelProvider>
                {children}
                <Toaster />
              </ModelProvider>
            </LanguageProvider>
          </Suspense>
        </BrandingProvider>
      </Suspense>
    </SessionProvider>
  )
} 