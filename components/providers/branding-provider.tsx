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

  // 브라우저에서만 실행되는 로직
  useEffect(() => {
    // localStorage에서 브랜딩 설정 불러오기
    const savedBranding = localStorage.getItem('branding-settings')
    if (savedBranding) {
      try {
        const parsed = JSON.parse(savedBranding)
        setBranding({ ...defaultBranding, ...parsed })
      } catch (error) {
        console.error('Failed to parse branding settings:', error)
      }
    }
  }, [])

  // 브랜딩 설정이 변경될 때마다 문서 title과 favicon 업데이트
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 문서 제목 업데이트
      document.title = branding.appName

      // 메타 description 업데이트
      const metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', `${branding.appName} is an open-source UI project designed to provide a seamless user interface for interacting with large language models (LLMs).`)
      }

      // favicon 업데이트
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
    }
  }, [branding])

  const updateBranding = (settings: Partial<BrandingSettings>) => {
    const newBranding = { ...branding, ...settings }
    setBranding(newBranding)
    
    // localStorage에 저장
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