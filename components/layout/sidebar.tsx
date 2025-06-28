"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Plus, Menu, Book } from "lucide-react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AccountMenu } from "@/components/ui/account-menu"
import { ChatGroupComponent } from "@/components/sidebar/chat-group"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { useBranding } from "@/components/providers/branding-provider"

interface SidebarProps {
  currentPage?: "chat" | "content"
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
}

// 채팅 항목 타입 정의
interface ChatItem {
  id: string
  title: string
  time: string
  timeAgo: string
}

// 채팅 그룹 타입 정의
interface ChatGroup {
  label: string
  items: ChatItem[]
}

export default function Sidebar({ currentPage = "chat", mobileSidebarOpen, setMobileSidebarOpen }: SidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const { lang, language } = useTranslation('common')
  const { branding } = useBranding()

  // 번역 파일 프리로드
  useEffect(() => {
    preloadTranslationModule(language, 'common')
  }, [language])

  // 채팅 그룹 데이터
  const chatGroups: ChatGroup[] = [
    {
      label: lang('sidebar.chatGroups.today'),
      items: [
        { id: "chat-1", title: "에프앤가이드 기업에...", time: "09:45", timeAgo: "15 hours" },
        { id: "chat-2", title: "BC카드의 힘써하는 스...", time: "08:30", timeAgo: "15 hours" },
      ],
    },
    {
      label: lang('sidebar.chatGroups.previous30Days'),
      items: [
        { id: "chat-3", title: "물지로가 비비가드 맛...", time: "14:22", timeAgo: "41 days" },
        { id: "chat-4", title: "BC카드 페이백을 통한...", time: "11:05", timeAgo: "41 days" },
        { id: "chat-5", title: "페이백 캐리터 디자인...", time: "16:30", timeAgo: "42 days" },
        { id: "chat-6", title: "페이백을 이용한 365...", time: "10:15", timeAgo: "42 days" },
      ],
    },
    {
      label: lang('sidebar.chatGroups.may'),
      items: [
        { id: "chat-7", title: "누룩 여행 일정 7일 24...", time: "09:00", timeAgo: "42 days" },
        { id: "chat-8", title: "BC카드 페이백을 통한...", time: "15:45", timeAgo: "42 days" },
      ],
    },
    {
      label: lang('sidebar.chatGroups.april'),
      items: [{ id: "chat-9", title: "서울 벚꽃 명소", time: "13:20", timeAgo: "47 days" }],
    },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-[#f5f5f5] border-r border-gray-200 flex-col transition-all duration-300 hidden md:flex overflow-hidden`}
      >
        {sidebarCollapsed ? (
          /* Collapsed Sidebar - Icon Only */
          <div className="flex flex-col h-full">
            <div className="p-0 border-b border-gray-200 h-[3rem] flex items-center justify-center">
              <Button variant="ghost" size="icon" className="h-8 w-8 focus:outline-none focus:ring-0" onClick={() => setSidebarCollapsed(false)}>
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 focus:outline-none focus:ring-0" onClick={() => router.push("/chat")}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 focus:outline-none focus:ring-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1"></div>

            <div className="p-4 border-t border-gray-200">
              <AccountMenu align="start" side="top">
                <Button variant="ghost" className="w-full justify-start h-10 px-2 transition-all duration-500 focus:outline-none focus:ring-0">
                  <Avatar className={`h-8 w-8 transition-transform duration-300 -translate-x-2`}>
                    <AvatarFallback className="bg-orange-500 text-white text-xs">A</AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium ml-2 transition-opacity duration-300">{lang('sidebar.admin')}</span>
                  )}
                </Button>
              </AccountMenu>
            </div>
          </div>
        ) : (
          /* Expanded Sidebar */
          <>
            {/* Header */}
            <div className="p-0 h-[3rem] flex items-center px-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  
                  {/* favicon */}
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {branding.appName.substring(0, 4).toLowerCase() || 'kkot'}
                    </span>
                  </div>

                  <Button
                    className={`flex items-center gap-2 bg-transparent hover:bg-gray-100 text-gray-700 focus:outline-none focus:ring-0`}
                    onClick={() => router.push("/chat")}
                  >
                    <Plus className="h-4 w-4" />
                    {lang('sidebar.newChat')}
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 focus:outline-none focus:ring-0" onClick={() => setSidebarCollapsed(true)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div
              className={`p-1 px-2 my-2 transition-opacity duration-200 ${sidebarCollapsed ? "opacity-0" : "opacity-100"}`}
            >
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input placeholder={lang('sidebar.searchPlaceholder')} className="pl-10 bg-white border-gray-200 focus:outline-none focus:ring-0 focus:border-gray-300" />
              </div>
            </div>

            {/* Content Button */}
            <div
              className={`p-1 px-2 transition-opacity duration-200 ${sidebarCollapsed ? "opacity-0" : "opacity-100"}`}
            >
              <Button
                className={`w-full justify-start gap-2 focus:outline-none focus:ring-0 ${
                  currentPage === "content"
                    ? "bg-gray-200 hover:bg-gray-200 text-gray-700 border border-gray-200"
                    : "bg-transparent hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => router.push("/book")}
              >
                <Book className="h-4 w-4" />
                {lang('sidebar.book')}
              </Button>
            </div>

            {/* Chat History - Grouped by Date */}
            <div className="flex-1 mt-3 overflow-y-auto">
              <div className="px-4">
                {chatGroups.map((group, groupIndex) => (
                  <ChatGroupComponent
                    key={groupIndex}
                    group={group}
                    groupIndex={groupIndex}
                    sidebarCollapsed={sidebarCollapsed}
                    selectedChatId={selectedChatId}
                    setSelectedChatId={setSelectedChatId}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Settings */}
            <div className="p-4">
              <AccountMenu align="start" side="top">
                <Button variant="ghost" className="w-full justify-start h-10 px-2 transition-all duration-300 focus:outline-none focus:ring-0">
                  <Avatar
                    className={`h-8 w-8 transition-transform duration-300 ${sidebarCollapsed ? "-translate-x-1" : ""}`}
                  >
                    <AvatarFallback className="bg-orange-500 text-white text-xs">A</AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium ml-2 transition-opacity duration-300">{lang('sidebar.admin')}</span>
                  )}
                </Button>
              </AccountMenu>
            </div>
          </>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileSidebarOpen(false)}></div>
          <div className="relative flex flex-col w-64 h-full bg-[#f5f5f5] border-r border-gray-200">
            {/* Header */}
            <div className="p-0 h-[3rem] flex items-center px-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {branding.appName.substring(0, 4).toLowerCase() || 'kkot'}
                    </span>
                  </div>
                  <Button
                    className="flex items-center gap-2 bg-transparent hover:bg-gray-100 text-gray-700 focus:outline-none focus:ring-0"
                    onClick={() => {
                      router.push("/chat")
                      setMobileSidebarOpen(false)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {lang('sidebar.newChat')}
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 focus:outline-none focus:ring-0" onClick={() => setMobileSidebarOpen(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="p-1 px-2 my-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input placeholder={lang('sidebar.searchPlaceholder')} className="pl-10 bg-white border-gray-200 focus:outline-none focus:ring-0 focus:border-gray-300" />
              </div>
            </div>

            {/* Content Button */}
            <div className="p-1 px-2">
              <Button
                className={`w-full justify-start gap-2 focus:outline-none focus:ring-0 ${
                  currentPage === "content"
                    ? "bg-gray-200 hover:bg-gray-200 text-gray-700 border border-gray-200"
                    : "bg-transparent hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => {
                  router.push("/book")
                  setMobileSidebarOpen(false)
                }}
              >
                <Book className="h-4 w-4" />
                {lang('sidebar.book')}
              </Button>
            </div>

            {/* Chat History - Grouped by Date */}
            <div className="flex-1 mt-3 overflow-y-auto">
              <div className="px-4">
                {chatGroups.map((group, groupIndex) => (
                  <ChatGroupComponent
                    key={groupIndex}
                    group={group}
                    groupIndex={groupIndex}
                    sidebarCollapsed={false}
                    selectedChatId={selectedChatId}
                    setSelectedChatId={setSelectedChatId}
                    setMobileSidebarOpen={setMobileSidebarOpen}
                    isMobile={true}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Settings */}
            <div className="p-4">
              <AccountMenu align="start" side="top">
                <Button variant="ghost" className="w-full justify-start h-10 px-2 transition-all duration-300 focus:outline-none focus:ring-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-orange-500 text-white text-xs">A</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{lang('sidebar.admin')}</span>
                </Button>
              </AccountMenu>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
