"use client"

import { useState, useEffect, useRef } from 'react'

// Global cache to store loaded images
const imageCache = new Set<string>()

export function useImagePreload(src: string | null | undefined): boolean {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      setIsLoaded(false)
      return
    }

    // Check if image is already in our cache
    if (imageCache.has(src)) {
      setIsLoaded(true)
      return
    }

    // Create new image element
    const img = new Image()
    imgRef.current = img
    
    const handleLoad = () => {
      imageCache.add(src) // Add to cache
      setIsLoaded(true)
    }
    
    const handleError = () => {
      setIsLoaded(false)
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)
    
    img.src = src
    
    // If image is already cached by browser, it will load immediately
    if (img.complete && img.naturalWidth > 0) {
      imageCache.add(src)
      setIsLoaded(true)
    }

    return () => {
      if (imgRef.current) {
        imgRef.current.removeEventListener('load', handleLoad)
        imgRef.current.removeEventListener('error', handleError)
      }
    }
  }, [src])

  return isLoaded
}
