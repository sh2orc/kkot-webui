'use client'

/**
 * 세션 정리 및 인증 관련 유틸리티 함수들
 */

/**
 * 모든 세션 관련 데이터를 정리하고 인증 페이지로 리다이렉트
 */
export async function clearSessionAndRedirect(reason: string = 'Session expired') {
  if (typeof window === 'undefined') return
  
  console.log(`Clearing session: ${reason}`)
  
  try {
    // Clear localStorage
    const keysToRemove = [
      'selectedModelId',
      'selectedModelType', 
      'userPreferences',
      'chatHistory',
      'lastSavedChat'
    ]
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`Failed to remove localStorage key ${key}:`, error)
      }
    })
    
    // Clear sessionStorage
    try {
      sessionStorage.clear()
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error)
    }
    
    // Clear NextAuth session
    try {
      const { signOut } = await import('next-auth/react')
      await signOut({ redirect: false, callbackUrl: '/auth' })
    } catch (signOutError) {
      console.error('Error during signOut:', signOutError)
    }
    
    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Force redirect to auth page
    if (!window.location.pathname.startsWith('/auth')) {
      console.log('Redirecting to auth page...')
      window.location.replace('/auth')
    }
    
  } catch (error) {
    console.error('Error during session cleanup:', error)
    // Fallback: force redirect even if cleanup fails
    window.location.replace('/auth')
  }
}

/**
 * 인증 에러인지 확인하는 함수
 */
export function isAuthError(error: any): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('401') || 
           message.includes('unauthorized') || 
           message.includes('authentication') ||
           message.includes('session')
  }
  return false
}

/**
 * 네트워크 에러인지 확인하는 함수
 */
export function isNetworkError(error: any): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('failed to fetch') || 
           message.includes('networkerror') ||
           message.includes('connection') ||
           message.includes('timeout')
  }
  return false
}

/**
 * 에러 메시지를 사용자 친화적으로 변환
 */
export function getErrorMessage(error: any, fallback: string = 'An unexpected error occurred'): string {
  if (isAuthError(error)) {
    return 'Authentication required. Please sign in again.'
  }
  
  if (isNetworkError(error)) {
    return 'Network connection error. Please check your internet connection and try again.'
  }
  
  if (error instanceof Error) {
    // Remove technical details and provide cleaner message
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.'
    }
    if (error.message.includes('404')) {
      return 'Resource not found. Please refresh the page.'
    }
    return error.message
  }
  
  return fallback
}

/**
 * API 응답을 안전하게 처리하는 헬퍼 함수
 */
export async function handleApiResponse(response: Response) {
  if (response.status === 401) {
    await clearSessionAndRedirect('Authentication expired')
    throw new Error('Authentication required')
  }
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }
  
  try {
    const data = await response.json()
    
    // Validate that response data is an object
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format')
    }
    
    return data
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      throw new Error('Invalid JSON response')
    }
    throw parseError
  }
}

/**
 * 객체가 null이나 undefined가 아닌지 안전하게 확인
 */
export function isValidObject(obj: any): obj is Record<string, any> {
  return obj !== null && obj !== undefined && typeof obj === 'object' && !Array.isArray(obj)
}

/**
 * 배열이 유효한지 안전하게 확인
 */
export function isValidArray(arr: any): arr is any[] {
  return Array.isArray(arr)
}

/**
 * Object.entries를 안전하게 호출
 */
export function safeObjectEntries(obj: any): [string, any][] {
  if (!isValidObject(obj)) {
    console.warn('Attempted to get entries of invalid object:', obj)
    return []
  }
  return Object.entries(obj)
}

/**
 * Object.keys를 안전하게 호출
 */
export function safeObjectKeys(obj: any): string[] {
  if (!isValidObject(obj)) {
    console.warn('Attempted to get keys of invalid object:', obj)
    return []
  }
  return Object.keys(obj)
}
