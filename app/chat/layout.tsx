"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Prevent loading screen on page reload
  useEffect(() => {
    // Detect and handle page reload
    const handleBeforeUnload = () => {
      // Save current URL to session storage
      sessionStorage.setItem('lastChatPath', pathname)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // If previous path is same on page load (reload case), handle without loading
    const lastPath = sessionStorage.getItem('lastChatPath')
    if (lastPath === pathname) {
      // Treat as reload and disable loading state
      document.body.classList.add('no-loading')
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname])

  return (
    <div className="flex-1 flex flex-col h-full">
      {children}
    </div>
  )
} 