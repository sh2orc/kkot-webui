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

  // Detect navigation between chat pages
  const isChatPageTransition = useCallback((currentPath: string, nextPath: string) => {
    // Check if navigating between chat pages (e.g.: /chat/123 -> /chat/456)
    const chatPathRegex = /^\/chat(\/.*)?$/
    return chatPathRegex.test(currentPath) && chatPathRegex.test(nextPath)
  }, [])

  const startTransition = useCallback((callback: () => void) => {
    // Save current scroll position
    if (pathname) {
      scrollPositions.current.set(pathname, window.scrollY)
    }
    
    // Check View Transitions API support
    if ('startViewTransition' in document && typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(() => {
        callback()
      })
      
      transition.ready.then(() => {
        setIsTransitioning(true)
      })
      
      transition.finished.then(() => {
        setIsTransitioning(false)
        // Restore previous scroll position
        const savedPosition = scrollPositions.current.get(pathname)
        if (savedPosition !== undefined) {
          window.scrollTo(0, savedPosition)
        }
        // Remove loading state class (after some time)
        setTimeout(() => {
          document.body.classList.remove('no-loading')
        }, 1000)
      })
    } else {
      // Fallback for browsers that don't support View Transitions API
      setIsTransitioning(true)
      callback()
      
      // Change state after animation time
      setTimeout(() => {
        setIsTransitioning(false)
        // Restore previous scroll position
        const savedPosition = scrollPositions.current.get(pathname)
        if (savedPosition !== undefined) {
          window.scrollTo(0, savedPosition)
        }
        // Remove loading state class
        setTimeout(() => {
          document.body.classList.remove('no-loading')
        }, 1000)
      }, 300)
    }
  }, [pathname])

  // Detect path changes
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      // Disable loading screen for navigation between chat pages
      if (isChatPageTransition(previousPathname.current, pathname)) {
        document.body.classList.add('no-loading')
        // Remove class after some time
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

// Custom Link component hook
export function useTransitionRouter() {
  const router = useNextRouter()
  const { startTransition } = usePageTransition()

  const push = useCallback((href: string) => {
    // Check if navigating between chat pages
    const isChatNavigation = /^\/chat(\/.*)?$/.test(href)
    
    // Disable loading screen for navigation between chat pages
    if (isChatNavigation) {
      document.body.classList.add('no-loading')
    }
    
    startTransition(() => {
      router.push(href)
    })
  }, [router, startTransition])

  const replace = useCallback((href: string) => {
    // Check if navigating between chat pages
    const isChatNavigation = /^\/chat(\/.*)?$/.test(href)
    
    // Disable loading screen for navigation between chat pages
    if (isChatNavigation) {
      document.body.classList.add('no-loading')
    }
    
    startTransition(() => {
      router.replace(href)
    })
  }, [router, startTransition])

  return { push, replace }
} 