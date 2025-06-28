'use client'

import { ReactNode, Suspense } from 'react'
import { BrandingProvider } from './branding-provider'
import LanguageProvider from './language-provider'
import { Toaster } from '@/components/ui/toaster'

// Basic Loading UI Component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
)

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BrandingProvider>
        <Suspense fallback={<LoadingFallback />}>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </Suspense>
      </BrandingProvider>
    </Suspense>
  )
} 