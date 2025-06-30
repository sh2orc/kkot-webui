"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Plus, Menu, Book, Link as LinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AccountMenu } from "@/components/ui/account-menu"
import { ChatGroupComponent } from "@/components/sidebar/chat-group"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { useBranding } from "@/components/providers/branding-provider"
import Image from "next/image"
import Link from "next/link"

interface SidebarProps {
  currentPage?: "chat" | "content"
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
}

// Chat item type definition
interface ChatItem {
  id: string
  title: string
  time: string
  timeAgo: string
}

// Chat group type definition
interface ChatGroup {
  label: string
  items: ChatItem[]
}

export default function Sidebar({ currentPage = "chat", mobileSidebarOpen, setMobileSidebarOpen }: SidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { lang, language } = useTranslation('common')
  const { branding } = useBranding()

  // Preload translation files
  useEffect(() => {
    preloadTranslationModule(language, 'common')
  }, [language])

  // Fetch chat sessions list
  const fetchChatSessions = async () => {
    if (!session?.user?.id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/chat?userId=${session.user.id}`)
      const data = await response.json()
      
      if (data.sessions) {
        // Group by date
        const groups = groupChatSessionsByDate(data.sessions)
        setChatGroups(groups)
      } else if (data.error) {
        console.error('Chat session load error:', data.error)
        setChatGroups([])
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error)
      setChatGroups([])
    } finally {
      setIsLoading(false)
    }
  }

  // Date-based grouping function
  const groupChatSessionsByDate = (sessions: any[]): ChatGroup[] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const groups: { [key: string]: ChatItem[] } = {
      today: [],
      previous30Days: [],
    }
    const monthGroups: { [key: string]: ChatItem[] } = {}

    sessions.forEach((session: any) => {
      const sessionDate = new Date(session.createdAt)
      const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
      
      // Generate time format
      const timeStr = sessionDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      
      // Calculate elapsed time
      const diffInHours = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60))
      const diffInDays = Math.floor(diffInHours / 24)
      let timeAgo = ''
      
      if (diffInHours < 24) {
        timeAgo = `${diffInHours}시간 전`
      } else {
        timeAgo = `${diffInDays}일 전`
      }

      const chatItem: ChatItem = {
        id: session.id,
        title: session.title,
        time: timeStr,
        timeAgo: timeAgo
      }

      // Group classification
      if (sessionDateOnly.getTime() === today.getTime()) {
        groups.today.push(chatItem)
      } else if (sessionDate.getTime() >= thirtyDaysAgo.getTime()) {
        groups.previous30Days.push(chatItem)
      } else {
        // Monthly groups
        const monthKey = sessionDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = []
        }
        monthGroups[monthKey].push(chatItem)
      }
    })

    const result: ChatGroup[] = []
    
    // Today group
    if (groups.today.length > 0) {
      result.push({
        label: lang('sidebar.chatGroups.today'),
        items: groups.today
      })
    }
    
    // Previous 30 days group
    if (groups.previous30Days.length > 0) {
      result.push({
        label: lang('sidebar.chatGroups.previous30Days'),
        items: groups.previous30Days
      })
    }
    
    // Monthly groups (from newest month)
    const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
      const dateA = new Date(a)
      const dateB = new Date(b)
      return dateB.getTime() - dateA.getTime()
    })
    
    sortedMonths.forEach(month => {
      result.push({
        label: month,
        items: monthGroups[month]
      })
    })

    return result
  }

  // Fetch chat sessions list when session is available
  useEffect(() => {
    if (session?.user?.id) {
      fetchChatSessions()
    }
    
    // Expose function globally for sidebar refresh
    if (typeof window !== 'undefined') {
      (window as any).refreshSidebar = fetchChatSessions
    }

    // Cleanup on component unmount
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).refreshSidebar
      }
    }
  }, [session?.user?.id])



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
                
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => router.push("/chat")}
                >
                  
                  {/* Logo */}
                  <Image
                    src="/images/logo.svg"
                    alt="Logo"
                    width={130}
                    height={24}
                    className="h-8 w-auto"
                  />

                  <div className={`overflow-hidden ml-1 transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-24 opacity-100'}`}>
                    <span className="whitespace-nowrap font-semibold text-gray-500">꽃 kkot</span>
                  </div>

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

            {/* Content Button : Hide in sidebar */}
            <div
              className={`p-1 px-2 transition-opacity duration-200 hidden ${sidebarCollapsed ? "opacity-0" : "opacity-100"}`}
              style={{ display: sidebarCollapsed ? 'none' : 'block' }}
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
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="space-y-1">
                        <div className="h-8 bg-gray-100 rounded"></div>
                        <div className="h-8 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                ) : chatGroups.length > 0 ? (
                  chatGroups.map((group, groupIndex) => (
                    <ChatGroupComponent
                      key={groupIndex}
                      group={group}
                      groupIndex={groupIndex}
                      sidebarCollapsed={sidebarCollapsed}
                      selectedChatId={selectedChatId}
                      setSelectedChatId={setSelectedChatId}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    {lang('sidebar.noChatHistory')}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Settings */}
            <div className="p-4">
              <AccountMenu align="start" side="top">
                <Button variant="ghost" className="w-full justify-start h-10 px-2 transition-all duration-300 focus:outline-none focus:ring-0">
                  <Avatar
                    className={`h-8 w-8 transition-transform duration-300 ${sidebarCollapsed ? "-translate-x-1" : ""}`}
                  >
                    <AvatarFallback className="bg-orange-500 text-white text-xs">
                      {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 
                       session?.user?.email ? session.user.email.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium ml-2 transition-opacity duration-300">
                      {session?.user?.name || session?.user?.email?.split('@')[0] || '사용자'}
                    </span>
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
                <Link 
                  href="/"
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  {/* Logo */}
                  <Image
                    src="/images/logo.svg"
                    alt="Logo"
                    width={130}
                    height={24}
                    className="h-8 w-auto"
                  />
                  <span className="whitespace-nowrap font-semibold text-gray-500">꽃 kkot</span>
                </Link>
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
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="space-y-1">
                        <div className="h-8 bg-gray-100 rounded"></div>
                        <div className="h-8 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                ) : chatGroups.length > 0 ? (
                  chatGroups.map((group, groupIndex) => (
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
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    {lang('sidebar.noChatHistory')}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Settings */}
            <div className="p-4">
              <AccountMenu align="start" side="top">
                <Button variant="ghost" className="w-full justify-start h-10 px-2 transition-all duration-300 focus:outline-none focus:ring-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-orange-500 text-white text-xs">
                      {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 
                       session?.user?.email ? session.user.email.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {session?.user?.name || session?.user?.email?.split('@')[0] || '사용자'}
                  </span>
                </Button>
              </AccountMenu>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
