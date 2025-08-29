"use client"

import { useState, useEffect, ReactNode } from 'react'
import { 
  LanguageContext, 
  Language, 
  getStoredLanguage, 
  setStoredLanguage,
  defaultLanguage,
  preloadTranslationModules,
  supportedLanguages
} from '@/lib/i18n'
import Loading from '@/components/ui/loading'

interface LanguageProviderProps {
  children: ReactNode
}

export default function LanguageProvider({ children }: LanguageProviderProps) {
  // Set initial value to getStoredLanguage() to apply browser language detection
  const [language, setCurrentLanguage] = useState<Language>(() => {
    // Execute only on client side
    if (typeof window !== 'undefined') {
      return getStoredLanguage()
    }
    return defaultLanguage
  })
  const [isLoading, setIsLoading] = useState(true)

  // List of all translation modules
  const translationModules = [
    'auth',
    'common',
    'admin',
    'admin.general',
    'admin.connection', 
    'admin.model',
    'admin.agent',
    'admin.api',
    'admin.evaluation',
    'admin.rag',
    'admin.tools',
    'admin.documents',
    'admin.database',
    'admin.websearch',
    'admin.image',
    'admin.audio',
    'admin.pipeline',
    'navbar',
    'settings',
    'chat',
    'book',
    'language'
  ]

  // Language change function (can change state immediately)
  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang)
    setStoredLanguage(lang)
    
    // Also save to cookie for server-side access
    if (typeof window !== 'undefined') {
      document.cookie = `language=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
    }
  }

  // Preload all translation modules for all languages during component initialization
  useEffect(() => {
    async function initializeAllTranslations() {
      const storedLang = getStoredLanguage()
      setCurrentLanguage(storedLang)
      
      // Save initial language to cookie for server-side access
      if (typeof window !== 'undefined') {
        document.cookie = `language=${storedLang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
      }
      
      // Load all translation modules for all supported languages simultaneously
      const loadPromises = supportedLanguages.map(language => 
        preloadTranslationModules(language, translationModules)
      )
      
      await Promise.all(loadPromises)
      setIsLoading(false)
    }
    
    initializeAllTranslations()
  }, []) // Empty dependency array - runs only once when component is created

  // Show loading state while translations are being loaded
  if (isLoading) {
    return <Loading />
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
} 
