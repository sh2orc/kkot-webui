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

  // 인증이 필요한 페이지 경로 확인
  const isAuthPage = pathname?.startsWith('/auth')
  const isPublicPage = isAuthPage || pathname === '/'
  const isAdminPage = pathname?.startsWith('/admin')
  
  // 현재 페이지 타입 결정
  const getCurrentPageType = () => {
    if (pathname?.startsWith('/chat')) return 'chat'
    if (pathname?.startsWith('/book')) return 'content'
    return 'chat' // 기본값
  }

  // 페이지 제목 결정
  const getPageTitle = () => {
    if (isAdminPage) {
      return 'Admin'
    }
    
    const pageType = getCurrentPageType()
    
    if (pageType === 'chat') {
      // 채팅 페이지에서는 동적 제목 처리
      if (pathname === '/chat') return 'New Chat'
      return 'Chat'
    }
    
    if (pageType === 'content') {
      return 'Book'
    }
    
    return 'KKOT WebUI'
  }

  // 로딩 상태 처리
  if (status === "loading") {
    return <Loading />
  }

  // 공개 페이지나 인증이 필요 없는 페이지는 사이드바 없이 렌더링
  if (isPublicPage || status === "unauthenticated") {
    return <>{children}</>
  }

  // 관리자 페이지는 자체 사이드바를 사용하므로 네비게이션 바만 표시
  if (isAdminPage) {
    return (
      <div className="flex h-screen bg-white">
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

  // 일반 페이지는 메인 사이드바가 있는 레이아웃 제공
  return (
    <div className="flex h-screen bg-white">
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