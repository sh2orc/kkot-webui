'use client'

import { ReactNode, Suspense } from 'react'
import { SessionProvider } from 'next-auth/react'
import { BrandingProvider } from './branding-provider'
import LanguageProvider from './language-provider'
import { ModelProvider } from './model-provider'
import { PageTransitionProvider } from './page-transition-provider'
import { Toaster } from '@/components/ui/toaster'
import Loading from '@/components/ui/loading'

// Basic Loading UI Component
const LoadingFallback = () => <Loading />

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
                <PageTransitionProvider>
                  {children}
                  <Toaster />
                </PageTransitionProvider>
              </ModelProvider>
            </LanguageProvider>
          </Suspense>
        </BrandingProvider>
      </Suspense>
    </SessionProvider>
  )
} 