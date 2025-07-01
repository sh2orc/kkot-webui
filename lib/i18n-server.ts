// Server-only i18n utilities
import 'server-only'

// Supported languages list
export const supportedLanguages = ['kor', 'eng'] as const
export type Language = typeof supportedLanguages[number]

// Default language
export const defaultLanguage: Language = 'kor'

// Translation module cache
const translationCache = new Map<string, any>()

// Static import maps for all translation modules
const translationModules = {
  kor: {
    'auth': () => import('@/i18n/kor/auth.json'),
    'admin': () => import('@/i18n/kor/admin.json'),
    'admin.agent': () => import('@/i18n/kor/admin.agent.json'),
    'admin.audio': () => import('@/i18n/kor/admin.audio.json'),
    'admin.connection': () => import('@/i18n/kor/admin.connection.json'),
    'admin.database': () => import('@/i18n/kor/admin.database.json'),
    'admin.documents': () => import('@/i18n/kor/admin.documents.json'),
    'admin.evaluation': () => import('@/i18n/kor/admin.evaluation.json'),
    'admin.general': () => import('@/i18n/kor/admin.general.json'),
    'admin.image': () => import('@/i18n/kor/admin.image.json'),
    'admin.model': () => import('@/i18n/kor/admin.model.json'),
    'admin.pipeline': () => import('@/i18n/kor/admin.pipeline.json'),
    'admin.tools': () => import('@/i18n/kor/admin.tools.json'),
    'admin.websearch': () => import('@/i18n/kor/admin.websearch.json'),
    'book': () => import('@/i18n/kor/book.json'),
    'chat': () => import('@/i18n/kor/chat.json'),
    'common': () => import('@/i18n/kor/common.json'),
    'language': () => import('@/i18n/kor/language.json'),
    'navbar': () => import('@/i18n/kor/navbar.json'),
    'settings': () => import('@/i18n/kor/settings.json'),
  },
  eng: {
    'auth': () => import('@/i18n/eng/auth.json'),
    'admin': () => import('@/i18n/eng/admin.json'),
    'admin.agent': () => import('@/i18n/eng/admin.agent.json'),
    'admin.audio': () => import('@/i18n/eng/admin.audio.json'),
    'admin.connection': () => import('@/i18n/eng/admin.connection.json'),
    'admin.database': () => import('@/i18n/eng/admin.database.json'),
    'admin.documents': () => import('@/i18n/eng/admin.documents.json'),
    'admin.evaluation': () => import('@/i18n/eng/admin.evaluation.json'),
    'admin.general': () => import('@/i18n/eng/admin.general.json'),
    'admin.image': () => import('@/i18n/eng/admin.image.json'),
    'admin.model': () => import('@/i18n/eng/admin.model.json'),
    'admin.pipeline': () => import('@/i18n/eng/admin.pipeline.json'),
    'admin.tools': () => import('@/i18n/eng/admin.tools.json'),
    'admin.websearch': () => import('@/i18n/eng/admin.websearch.json'),
    'book': () => import('@/i18n/eng/book.json'),
    'chat': () => import('@/i18n/eng/chat.json'),
    'common': () => import('@/i18n/eng/common.json'),
    'language': () => import('@/i18n/eng/language.json'),
    'navbar': () => import('@/i18n/eng/navbar.json'),
    'settings': () => import('@/i18n/eng/settings.json'),
  },
} as const

// Server-side module loading function
export async function loadTranslationModule(language: Language, module: string): Promise<any> {
  const cacheKey = `${language}.${module}`
  
  // Check from cache
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    // Use static import map
    const moduleMap = translationModules[language]
    const moduleLoader = moduleMap[module as keyof typeof moduleMap]
    
    if (!moduleLoader) {
      throw new Error(`Translation module '${module}' not found for language '${language}'`)
    }
    
    const translations = await moduleLoader()
    const data = translations.default
    
    // Save to cache
    translationCache.set(cacheKey, data)
    
    return data
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

// Server-side translation function
export async function getServerTranslation(language: Language, module: string, key: string): Promise<string> {
  const translations = await loadTranslationModule(language, module)
  return getTranslationKey(translations, key)
}

// Preload translation module
export async function preloadTranslationModule(language: Language, module: string) {
  await loadTranslationModule(language, module)
}

// Preload multiple modules at once
export async function preloadTranslationModules(language: Language, modules: string[]) {
  await Promise.all(modules.map(module => loadTranslationModule(language, module)))
} 