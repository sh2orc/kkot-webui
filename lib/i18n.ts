import { createContext, useContext } from 'react'

// 지원되는 언어 목록
export const supportedLanguages = ['kor', 'eng'] as const
export type Language = typeof supportedLanguages[number]

// 기본 언어
export const defaultLanguage: Language = 'kor'

// 번역 모듈 캐시
const translationCache = new Map<string, any>()

// 모듈 로딩 함수
export async function loadTranslationModule(language: Language, module: string): Promise<any> {
  const cacheKey = `${language}.${module}`
  
  // 캐시에서 확인
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    // 동적으로 모듈 로드
    const data = await import(`../i18n/${language}/${module}.json`)
    const translations = data.default
    
    // 캐시에 저장
    translationCache.set(cacheKey, translations)
    
    return translations
  } catch (error) {
    console.error(`Failed to load translation module ${module} for ${language}:`, error)
    
    // 기본 언어로 폴백
    if (language !== defaultLanguage) {
      return loadTranslationModule(defaultLanguage, module)
    }
    
    // 빈 객체 반환 (에러 방지)
    return {}
  }
}

// 번역 키를 가져오는 함수
export function getTranslationKey(translations: any, key: string): string {
  const keys = key.split('.')
  let result = translations
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k]
    } else {
      return key // 키가 없으면 원본 키 반환
    }
  }
  
  return typeof result === 'string' ? result : key
}

// 번역 훅 (페이지별 사용)
export function useTranslation(module: string) {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }

  const { language } = context
  
  // 번역 함수
  const t = async (key: string): Promise<string> => {
    const translations = await loadTranslationModule(language, module)
    return getTranslationKey(translations, key)
  }

  // 동기식 번역 함수 (캐시된 경우에만)
  const lang = (key: string): string => {
    const cacheKey = `${language}.${module}`
    const translations = translationCache.get(cacheKey)
    
    if (translations) {
      return getTranslationKey(translations, key)
    }
    
    return key // 캐시되지 않은 경우 키 반환
  }

  return { t, lang, language }
}

// 언어 컨텍스트 타입
export interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextType | null>(null)

// 언어 컨텍스트를 사용하는 훅
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// 로컬 스토리지에서 언어 설정을 가져오는 함수
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return defaultLanguage
  
  const stored = localStorage.getItem('language')
  if (stored && supportedLanguages.includes(stored as Language)) {
    return stored as Language
  }
  return defaultLanguage
}

// 로컬 스토리지에 언어 설정을 저장하는 함수
export function setStoredLanguage(language: Language) {
  if (typeof window === 'undefined') return
  localStorage.setItem('language', language)
}

// 번역 모듈을 프리로드하는 함수
export async function preloadTranslationModule(language: Language, module: string) {
  await loadTranslationModule(language, module)
}

// 여러 모듈을 한번에 프리로드하는 함수
export async function preloadTranslationModules(language: Language, modules: string[]) {
  await Promise.all(modules.map(module => loadTranslationModule(language, module)))
} 