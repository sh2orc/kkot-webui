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
  const [language, setCurrentLanguage] = useState<Language>(defaultLanguage)
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
  }

  // Preload all translation modules for all languages during component initialization
  useEffect(() => {
    async function initializeAllTranslations() {
      const storedLang = getStoredLanguage()
      setCurrentLanguage(storedLang)
      
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
