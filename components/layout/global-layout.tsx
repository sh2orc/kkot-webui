"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import Sidebar from "./sidebar"
import Navbar from "./navbar"
import Loading from "@/components/ui/loading"

interface GlobalLayoutProps {
  children: React.ReactNode
}

export default function GlobalLayout({ children }: GlobalLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Check if authentication is required for page path
  const isAuthPage = pathname?.startsWith('/auth')
  const isPublicPage = isAuthPage || pathname === '/'
  const isAdminPage = pathname?.startsWith('/admin')
  
  // Determine current page type
  const getCurrentPageType = () => {
    if (pathname?.startsWith('/chat')) return 'chat'
    if (pathname?.startsWith('/book')) return 'content'
    return 'chat' // Default value
  }

  // Determine page title
  const getPageTitle = () => {
    if (isAdminPage) {
      return 'Admin'
    }
    
    const pageType = getCurrentPageType()
    
    if (pageType === 'chat') {
      // Handle dynamic title for chat pages
      if (pathname === '/chat') return 'New Chat'
      return 'Chat'
    }
    
    if (pageType === 'content') {
      return 'Book'
    }
    
    return 'KKOT WebUI'
  }

  // Handle loading state
  if (status === "loading") {
    return <Loading />
  }

  // Render public pages or pages that don't require authentication without sidebar
  if (isPublicPage || status === "unauthenticated") {
    return <>{children}</>
  }

  // Admin pages use their own sidebar, so only show navigation bar
  if (isAdminPage) {
    return (
      <div className="flex h-screen bg-white dark:bg-gray-900">
        <div className="flex-1 flex flex-col">
          <Navbar
            title={getPageTitle()}
            onMobileMenuClick={() => setMobileSidebarOpen(true)}
          />
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    )
  }

  // Provide layout with main sidebar for regular pages
  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar
        currentPage={getCurrentPageType()}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col">
        <Navbar
          title={getPageTitle()}
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
        />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
} 