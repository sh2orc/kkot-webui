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

interface LanguageProviderProps {
  children: ReactNode
}

export default function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setCurrentLanguage] = useState<Language>(defaultLanguage)
  const [isLoading, setIsLoading] = useState(true)

  // 모든 번역 모듈 목록
  const translationModules = [
    'common',
    'admin',
    'admin.general',
    'admin.connection', 
    'admin.model',
    'admin.agent',
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
    'language'
  ]

  // 언어 변경 함수 (상태 즉시 변경 가능)
  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang)
    setStoredLanguage(lang)
  }

  // 컴포넌트 초기화 시 모든 언어의 모든 번역 모듈을 미리 로드
  useEffect(() => {
    async function initializeAllTranslations() {
      const storedLang = getStoredLanguage()
      setCurrentLanguage(storedLang)
      
      // 모든 지원되는 언어의 모든 번역 모듈을 동시에 로드
      const loadPromises = supportedLanguages.map(language => 
        preloadTranslationModules(language, translationModules)
      )
      
      await Promise.all(loadPromises)
      setIsLoading(false)
    }
    
    initializeAllTranslations()
  }, []) // 빈 의존성 배열 - 컴포넌트 생성 시에만 한 번만 실행

  // 로딩 중이면 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
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
