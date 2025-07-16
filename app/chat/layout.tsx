"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // 페이지 리로드 시 로딩 화면 방지
  useEffect(() => {
    // 페이지 리로드 감지 및 처리
    const handleBeforeUnload = () => {
      // 현재 URL을 세션 스토리지에 저장
      sessionStorage.setItem('lastChatPath', pathname)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // 페이지 로드 시 이전 경로가 같으면 (리로드인 경우) 로딩 없이 처리
    const lastPath = sessionStorage.getItem('lastChatPath')
    if (lastPath === pathname) {
      // 리로드로 간주하여 로딩 상태 비활성화 처리
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