"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  faviconUrl: '/images/favicon.png',
  logoUrl: ''
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

interface BrandingProviderProps {
  children: ReactNode
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding)
  const [isInitialized, setIsInitialized] = useState(false)

  // Logic that only runs in the browser
  useEffect(() => {
    // Don't execute if already initialized
    if (isInitialized) return
    
    // Load branding settings from localStorage
    if (typeof window !== 'undefined') {
      const savedBranding = localStorage.getItem('branding-settings')
      if (savedBranding) {
        try {
          const parsed = JSON.parse(savedBranding)
          setBranding({ ...defaultBranding, ...parsed })
        } catch (error) {
          console.error('Failed to parse branding settings:', error)
        }
      }
      
      // Get app name from DB - silently ignore errors
      try {
        fetch('/api/admin-settings?key=app.name')
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch app name')
            return res.json()
          })
          .then(data => {
            if (data && data.value) {
              setBranding(prev => ({
                ...prev,
                appName: data.value
              }))
              // Update localStorage as well
              const currentSettings = localStorage.getItem('branding-settings')
              const settings = currentSettings ? JSON.parse(currentSettings) : {}
              localStorage.setItem('branding-settings', JSON.stringify({
                ...settings,
                appName: data.value
              }))
            }
          })
          .catch(error => {
            console.warn('Failed to fetch app name from DB:', error)
          })
          .finally(() => {
            setIsInitialized(true)
          })
      } catch (error) {
        console.warn('Error occurred while fetching app name:', error)
        setIsInitialized(true)
      }
    }
  }, [isInitialized])

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
          favicon.type = 'image/png'
          favicon.href = branding.faviconUrl
          document.head.appendChild(favicon)
        }
      } catch (error) {
        console.warn('Error updating document properties:', error)
      }
    }
  }, [branding])

  const updateBranding = (settings: Partial<BrandingSettings>) => {
    const newBranding = { ...branding, ...settings }
    setBranding(newBranding)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('branding-settings', JSON.stringify(newBranding))
    }
  }

  const resetBranding = () => {
    setBranding(defaultBranding)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('branding-settings')
    }
  }

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