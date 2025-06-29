import { createContext, useContext } from 'react'

// Supported languages list
export const supportedLanguages = ['kor', 'eng'] as const
export type Language = typeof supportedLanguages[number]

// Default language
export const defaultLanguage: Language = 'kor'

// Translation module cache
const translationCache = new Map<string, any>()

// Module loading function
export async function loadTranslationModule(language: Language, module: string): Promise<any> {
  const cacheKey = `${language}.${module}`
  
  // Check from cache
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    // Load module dynamically
    const data = await import(`../i18n/${language}/${module}.json`)
    const translations = data.default
    
    // Save to cache
    translationCache.set(cacheKey, translations)
    
    return translations
  } catch (error) {
    console.error(`Failed to load translation module ${module} for ${language}:`, error)
    
    // Fallback to default language
    if (language !== defaultLanguage) {
      return loadTranslationModule(defaultLanguage, module)
    }
    
    // Return empty object (error prevention)
    return {}
  }
}

// Function to get translation key
export function getTranslationKey(translations: any, key: string): string {
  const keys = key.split('.')
  let result = translations
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k]
    } else {
      return key // Return original key if key doesn't exist
    }
  }
  
  return typeof result === 'string' ? result : key
}

// Translation hook (page-specific usage)
export function useTranslation(module: string) {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }

  const { language } = context
  
  // Translation function
  const t = async (key: string): Promise<string> => {
    const translations = await loadTranslationModule(language, module)
    return getTranslationKey(translations, key)
  }

  // Synchronous translation function (only when cached)
  const lang = (key: string): string => {
    const cacheKey = `${language}.${module}`
    const translations = translationCache.get(cacheKey)
    
    if (translations) {
      return getTranslationKey(translations, key)
    }
    
    return key // Return key if not cached
  }

  return { t, lang, language }
}

// Language context type
export interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextType | null>(null)

// Hook for using language context
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Get language settings from local storage
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return defaultLanguage
  
  const stored = localStorage.getItem('language')
  if (stored && supportedLanguages.includes(stored as Language)) {
    return stored as Language
  }
  return defaultLanguage
}

// Save language settings to local storage
export function setStoredLanguage(language: Language) {
  if (typeof window === 'undefined') return
  localStorage.setItem('language', language)
}

// Preload translation module
export async function preloadTranslationModule(language: Language, module: string) {
  await loadTranslationModule(language, module)
}

// Preload multiple modules at once
export async function preloadTranslationModules(language: Language, modules: string[]) {
  await Promise.all(modules.map(module => loadTranslationModule(language, module)))
} 