"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface StyleSettings {
  sidebarBackgroundColor: string
  sidebarTextColor: string
}

interface StyleContextType {
  style: StyleSettings
  updateStyle: (settings: Partial<StyleSettings>) => void
  resetStyle: () => void
}

const defaultStyle: StyleSettings = {
  sidebarBackgroundColor: '#f5f5f5',
  sidebarTextColor: '#374151',
}

const StyleContext = createContext<StyleContextType | undefined>(undefined)

interface StyleProviderProps {
  children: React.ReactNode
}

export function StyleProvider({ children }: StyleProviderProps) {
  // Initialize from localStorage first
  const getInitialStyle = (): StyleSettings => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('system-style')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          const { _cachedAt, ...styleData } = parsed
          return { ...defaultStyle, ...styleData }
        } catch (e) {
          console.error('Failed to parse cached style:', e)
        }
      }
    }
    return defaultStyle
  }

  const [style, setStyle] = useState<StyleSettings>(getInitialStyle)
  const [isInitialized, setIsInitialized] = useState(false)
  const { data: session, status } = useSession()

  // Fetch style from DB when user logs in
  useEffect(() => {
    if (isInitialized) return
    
    // Only fetch if user is authenticated
    if (status === 'authenticated' && session?.user) {
            // Always fetch on login to get latest settings
      Promise.all([
        fetch('/api/admin-settings?key=style.sidebarBackgroundColor').then(res => res.ok ? res.json() : null),
        fetch('/api/admin-settings?key=style.sidebarTextColor').then(res => res.ok ? res.json() : null)
      ])
        .then(([bgColorData, textColorData]) => {
          const newStyle = {
            ...style,
            sidebarBackgroundColor: bgColorData?.value || style.sidebarBackgroundColor,
            sidebarTextColor: textColorData?.value || style.sidebarTextColor
          }
          setStyle(newStyle)
          // Cache for future use
          localStorage.setItem('system-style', JSON.stringify({
            ...newStyle,
            _cachedAt: Date.now()
          }))
        })
        .catch(error => {
          console.error('Failed to fetch style settings:', error)
        })
    }
    
    setIsInitialized(true)
  }, [status, session, isInitialized])

  // Clear cache on logout
  useEffect(() => {
    if (status === 'unauthenticated') {
      localStorage.removeItem('system-style')
      setStyle(defaultStyle)
    }
  }, [status])

  // Apply style settings to CSS variables
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--sidebar-background-custom', style.sidebarBackgroundColor)
      document.documentElement.style.setProperty('--sidebar-text-custom', style.sidebarTextColor)
    }
  }, [style.sidebarBackgroundColor, style.sidebarTextColor])

  const updateStyle = useCallback((settings: Partial<StyleSettings>) => {
    setStyle(prev => {
      const newStyle = { ...prev, ...settings }
      // Update cache
      if (typeof window !== 'undefined') {
        localStorage.setItem('system-style', JSON.stringify({
          ...newStyle,
          _cachedAt: Date.now()
        }))
      }
      return newStyle
    })
  }, [])

  const resetStyle = useCallback(() => {
    setStyle(defaultStyle)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('system-style')
    }
  }, [])

  return (
    <StyleContext.Provider value={{ style, updateStyle, resetStyle }}>
      {children}
    </StyleContext.Provider>
  )
}

export function useStyle(): StyleContextType {
  const context = useContext(StyleContext)
  if (context === undefined) {
    throw new Error('useStyle must be used within a StyleProvider')
  }
  return context
}
