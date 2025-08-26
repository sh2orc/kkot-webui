'use client'

import { ReactNode, Suspense } from 'react'
import { SessionProvider } from 'next-auth/react'
import { BrandingProvider } from './branding-provider'
import LanguageProvider from './language-provider'
import { ModelProvider } from './model-provider'
import { PageTransitionProvider } from './page-transition-provider'
import { Toaster } from 'sonner'
import Loading from '@/components/ui/loading'
import { TimezoneProvider } from './timezone-provider'

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
                <TimezoneProvider>
                  <PageTransitionProvider>
                    {children}
                    <Toaster position="top-right" richColors />
                  </PageTransitionProvider>
                </TimezoneProvider>
              </ModelProvider>
            </LanguageProvider>
          </Suspense>
        </BrandingProvider>
      </Suspense>
    </SessionProvider>
  )
} 