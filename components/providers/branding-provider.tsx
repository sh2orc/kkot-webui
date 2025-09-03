"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface BrandingSettings {
  appName: string
  faviconUrl: string
  logoUrl: string
}

interface BrandingContextType {
  branding: BrandingSettings
  updateBranding: (settings: Partial<BrandingSettings>) => void
  resetBranding: () => void
}

const defaultBranding: BrandingSettings = {
  appName: 'kkot-webui',
  faviconUrl: '/images/favicon.ico',
  logoUrl: ''
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

interface BrandingProviderProps {
  children: ReactNode
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  // Initialize from localStorage first
  const getInitialBranding = (): BrandingSettings => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('system-branding')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          const { _cachedAt, ...brandingData } = parsed
          return { ...defaultBranding, ...brandingData }
        } catch (e) {
          console.error('Failed to parse cached branding:', e)
        }
      }
    }
    return defaultBranding
  }

  const [branding, setBranding] = useState<BrandingSettings>(getInitialBranding)
  const [isInitialized, setIsInitialized] = useState(false)
  const { data: session, status } = useSession()

  // Fetch branding from DB when user logs in
  useEffect(() => {
    if (isInitialized) return
    
    // Only fetch if user is authenticated
    if (status === 'authenticated' && session?.user) {
      // Always fetch on login to get latest settings
      fetch('/api/admin-settings?key=app.name')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.value) {
            const newBranding = {
              ...branding,
              appName: data.value
            }
            setBranding(newBranding)
            // Cache for future use
            localStorage.setItem('system-branding', JSON.stringify({
              ...newBranding,
              _cachedAt: Date.now()
            }))
          }
        })
        .catch(error => {
          console.error('Failed to fetch branding:', error)
        })
    }
    
    setIsInitialized(true)
  }, [status, session, isInitialized])

  // Clear cache on logout
  useEffect(() => {
    if (status === 'unauthenticated') {
      localStorage.removeItem('system-branding')
      setBranding(defaultBranding)
    }
  }, [status])

  // Update document title and favicon whenever branding settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Update document title
        document.title = branding.appName

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
          metaDescription.setAttribute('content', `${branding.appName} is an open-source UI project designed to provide a seamless user interface for interacting with large language models (LLMs).`)
        }

        // Update favicon
        const existingFavicon = document.querySelector('link[rel="icon"]')
        if (existingFavicon) {
          existingFavicon.setAttribute('href', branding.faviconUrl)
        } else {
          const favicon = document.createElement('link')
          favicon.rel = 'icon'
          favicon.type = 'image/x-icon'
          favicon.href = branding.faviconUrl
          document.head.appendChild(favicon)
        }
      } catch (error) {
        console.warn('Error updating document properties:', error)
      }
    }
  }, [branding])

  const updateBranding = useCallback((settings: Partial<BrandingSettings>) => {
    setBranding(prev => {
      const newBranding = { ...prev, ...settings }
      // Update cache
      if (typeof window !== 'undefined') {
        localStorage.setItem('system-branding', JSON.stringify(newBranding))
      }
      return newBranding
    })
  }, [])

  const resetBranding = useCallback(() => {
    setBranding(defaultBranding)
  }, [])


  return (
    <BrandingContext.Provider value={{ branding, updateBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding(): BrandingContextType {
  const context = useContext(BrandingContext)
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
} 