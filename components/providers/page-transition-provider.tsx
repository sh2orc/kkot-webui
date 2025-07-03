"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useRouter as useNextRouter } from 'next/navigation'

interface PageTransitionContextType {
  isTransitioning: boolean
  startTransition: (callback: () => void) => void
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  isTransitioning: false,
  startTransition: () => {},
})

export const usePageTransition = () => useContext(PageTransitionContext)

interface PageTransitionProviderProps {
  children: React.ReactNode
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const pathname = usePathname()
  const previousPathname = useRef(pathname)
  const scrollPositions = useRef<Map<string, number>>(new Map())

  // 채팅 페이지 간 이동 감지
  const isChatPageTransition = useCallback((currentPath: string, nextPath: string) => {
    // 채팅 페이지 간 이동 여부 확인 (예: /chat/123 -> /chat/456)
    const chatPathRegex = /^\/chat(\/.*)?$/
    return chatPathRegex.test(currentPath) && chatPathRegex.test(nextPath)
  }, [])

  const startTransition = useCallback((callback: () => void) => {
    // 현재 스크롤 위치 저장
    if (pathname) {
      scrollPositions.current.set(pathname, window.scrollY)
    }
    
    // View Transitions API 지원 여부 확인
    if ('startViewTransition' in document && typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(() => {
        callback()
      })
      
      transition.ready.then(() => {
        setIsTransitioning(true)
      })
      
      transition.finished.then(() => {
        setIsTransitioning(false)
        // 이전 스크롤 위치 복원
        const savedPosition = scrollPositions.current.get(pathname)
        if (savedPosition !== undefined) {
          window.scrollTo(0, savedPosition)
        }
        // 로딩 상태 클래스 제거 (일정 시간 후)
        setTimeout(() => {
          document.body.classList.remove('no-loading')
        }, 1000)
      })
    } else {
      // View Transitions API를 지원하지 않는 경우 fallback
      setIsTransitioning(true)
      callback()
      
      // 애니메이션 시간 후 상태 변경
      setTimeout(() => {
        setIsTransitioning(false)
        // 이전 스크롤 위치 복원
        const savedPosition = scrollPositions.current.get(pathname)
        if (savedPosition !== undefined) {
          window.scrollTo(0, savedPosition)
        }
        // 로딩 상태 클래스 제거
        setTimeout(() => {
          document.body.classList.remove('no-loading')
        }, 1000)
      }, 300)
    }
  }, [pathname])

  // 경로 변경 감지
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      // 채팅 페이지 간 이동인 경우 로딩 화면 비활성화
      if (isChatPageTransition(previousPathname.current, pathname)) {
        document.body.classList.add('no-loading')
        // 일정 시간 후 클래스 제거
        setTimeout(() => {
          document.body.classList.remove('no-loading')
        }, 1000)
      }
      previousPathname.current = pathname
    }
  }, [pathname, isChatPageTransition])

  return (
    <PageTransitionContext.Provider value={{ isTransitioning, startTransition }}>
      <div className={`page-transition-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
        {children}
      </div>
    </PageTransitionContext.Provider>
  )
}

// 커스텀 Link 컴포넌트 훅
export function useTransitionRouter() {
  const router = useNextRouter()
  const { startTransition } = usePageTransition()

  const push = useCallback((href: string) => {
    // 채팅 페이지 간 이동 여부 확인
    const isChatNavigation = /^\/chat(\/.*)?$/.test(href)
    
    // 채팅 페이지 간 이동인 경우 로딩 화면 비활성화
    if (isChatNavigation) {
      document.body.classList.add('no-loading')
    }
    
    startTransition(() => {
      router.push(href)
    })
  }, [router, startTransition])

  const replace = useCallback((href: string) => {
    // 채팅 페이지 간 이동 여부 확인
    const isChatNavigation = /^\/chat(\/.*)?$/.test(href)
    
    // 채팅 페이지 간 이동인 경우 로딩 화면 비활성화
    if (isChatNavigation) {
      document.body.classList.add('no-loading')
    }
    
    startTransition(() => {
      router.replace(href)
    })
  }, [router, startTransition])

  return { push, replace }
} 