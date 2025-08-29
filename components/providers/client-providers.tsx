'use client'

import { ReactNode, Suspense, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { BrandingProvider } from './branding-provider'
import LanguageProvider from './language-provider'
import { ModelProvider } from './model-provider'
import { PageTransitionProvider } from './page-transition-provider'
import { Toaster } from 'sonner'
import Loading from '@/components/ui/loading'
import { TimezoneProvider } from './timezone-provider'
import { ThemeProvider } from '@/components/theme-provider'

// Basic Loading UI Component
const LoadingFallback = () => <Loading />

// Initialize user preferences
function PreferencesInitializer() {
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences')
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences)
        
        // Apply saved font size
        if (parsed.fontSize) {
          document.documentElement.classList.remove('font-small', 'font-medium', 'font-large')
          document.documentElement.classList.add(`font-${parsed.fontSize}`)
        }
      } catch (error) {
        console.error('Failed to parse preferences:', error)
      }
    }
  }, [])
  
  return null
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchOnWindowFocus={false}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Suspense fallback={<LoadingFallback />}>
          <BrandingProvider>
            <Suspense fallback={<LoadingFallback />}>
              <LanguageProvider>
                <ModelProvider>
                  <TimezoneProvider>
                    <PageTransitionProvider>
                      <PreferencesInitializer />
                      {children}
                      <Toaster position="top-right" richColors />
                    </PageTransitionProvider>
                  </TimezoneProvider>
                </ModelProvider>
              </LanguageProvider>
            </Suspense>
          </BrandingProvider>
        </Suspense>
      </ThemeProvider>
    </SessionProvider>
  )
} 