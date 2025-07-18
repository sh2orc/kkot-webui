"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Plus, Menu, Book, Link as LinkIcon, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AccountMenu } from "@/components/ui/account-menu"
import { ChatGroupComponent } from "@/components/sidebar/chat-group"
import { ChatHistorySkeleton } from "@/components/sidebar/chat-history-skeleton"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { useBranding } from "@/components/providers/branding-provider"
import Image from "next/image"
import TransitionLink from "@/components/ui/transition-link"
import { useTransitionRouter } from "@/components/providers/page-transition-provider"

interface SidebarProps {
  currentPage?: "chat" | "content"
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  initialChatSessions?: any[]
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

export default function Sidebar({ 
  currentPage = "chat", 
  mobileSidebarOpen, 
  setMobileSidebarOpen,
  initialChatSessions = []
}: SidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([])
  const [isLoading, setIsLoading] = useState(true) // Set initial value to true
  const { lang, language } = useTranslation('common')
  const { branding } = useBranding()

  // Preload translation files
  useEffect(() => {
    preloadTranslationModule(language, 'common')
  }, [language])

  // Filter chat groups based on search query
  const filteredChatGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return chatGroups
    }

    const query = searchQuery.toLowerCase()
    return chatGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.title.toLowerCase().includes(query)
      )
    })).filter(group => group.items.length > 0)
  }, [chatGroups, searchQuery])

  // Clear search
  const clearSearch = () => {
    setSearchQuery("")
  }

  // Update selectedChatId based on current pathname
  useEffect(() => {
    const chatIdMatch = pathname.match(/^\/chat\/(.+)$/)
    if (chatIdMatch) {
      // We're on a specific chat page
      setSelectedChatId(chatIdMatch[1])
    } else if (pathname === '/chat') {
      // We're on the new chat page
      setSelectedChatId(null)
    }
  }, [pathname])

  // Date-based grouping function
  const groupChatSessionsByDate = (sessions: any[]): ChatGroup[] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const groups: { [key: string]: ChatItem[] } = {
      today: [],
      yesterday: [],
      previous7Days: [],
      previous30Days: [],
    }
    const monthGroups: { [key: string]: ChatItem[] } = {}

    sessions.forEach((session: any) => {
      // Handle timestamp conversion properly for SQLite (integer) and PostgreSQL (string)
      let sessionDate: Date;
      if (session.createdAt) {
        sessionDate = new Date(session.createdAt);
        if (isNaN(sessionDate.getTime())) {
          sessionDate = new Date();
        }
      } else {
        sessionDate = new Date();
      }
      
      const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
      
      // Generate time format
      const timeStr = sessionDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      
      // Calculate elapsed time
      const diffInHours = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60))
      const diffInDays = Math.floor(diffInHours / 24)
      let timeAgo = ''
      
      if (diffInHours < 24) {
        timeAgo = lang('sidebar.timeAgo.hoursAgo').replace('{{hours}}', diffInHours.toString())
      } else {
        timeAgo = lang('sidebar.timeAgo.daysAgo').replace('{{days}}', diffInDays.toString())
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
      } else if (sessionDateOnly.getTime() === yesterday.getTime()) {
        groups.yesterday.push(chatItem)
      } else if (sessionDate.getTime() >= sevenDaysAgo.getTime()) {
        groups.previous7Days.push(chatItem)
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
    
    // Yesterday group
    if (groups.yesterday.length > 0) {
      result.push({
        label: lang('sidebar.chatGroups.yesterday'),
        items: groups.yesterday
      })
    }
    
    // Previous 7 days group
    if (groups.previous7Days.length > 0) {
      result.push({
        label: lang('sidebar.chatGroups.previous7Days'),
        items: groups.previous7Days
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

  // Fetch chat sessions list (CSR fallback)
  const fetchChatSessions = async () => {
    if (!session?.user?.id) {
      console.log('No session available, skipping chat sessions fetch')
      setIsLoading(false)
      setChatGroups([])
      return
    }

    try {
      setIsLoading(true)
      console.log('Fetching chat sessions for user:', session.user.id)
      const response = await fetch(`/api/chat?userId=${session.user.id}`)
      const data = await response.json()
      
      if (response.status === 401 || response.status === 404) {
        // 인증 오류 또는 리소스 없음 시 홈페이지로 리다이렉트
        router.push('/')
        return
      }
      
      if (data.sessions) {
        // Group by date
        const groups = groupChatSessionsByDate(data.sessions)
        setChatGroups(groups)
      } else if (data.error) {
        console.error('Chat session load error:', data.error)
        // "Invalid user" 에러 시 홈페이지로 리다이렉트
        if (data.error === 'Invalid user') {
          router.push('/')
          return
        }
        setChatGroups([])
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error)
      setChatGroups([])
    } finally {
      setIsLoading(false)
    }
  }

  // Set initial chat groups with SSR data
  useEffect(() => {
    if (initialChatSessions.length > 0) {
      const groups = groupChatSessionsByDate(initialChatSessions)
      setChatGroups(groups)
      setIsLoading(false) // Loading complete when initial data exists
    }
  }, [initialChatSessions, lang])

  // Session state and data loading management
  useEffect(() => {
    if (status === 'loading') {
      // Session loading
      setIsLoading(true)
      return
    }

    if (status === 'unauthenticated') {
      // Unauthenticated state
      setIsLoading(false)
      setChatGroups([])
      return
    }

    if (status === 'authenticated') {
      // Authenticated state
      if (initialChatSessions.length === 0 && session?.user?.id) {
        // Only fetch data with CSR when there's no SSR data and session exists
        fetchChatSessions()
      } else if (initialChatSessions.length === 0) {
        // Loading complete if there's no initial data and no session
        setIsLoading(false)
      }
    }
  }, [status, session?.user?.id, initialChatSessions.length, router])

  // Register global functions and set up event listeners
  useEffect(() => {
    
    // Expose function globally for sidebar refresh
    if (typeof window !== 'undefined') {
      (window as any).refreshSidebar = fetchChatSessions
    }

    // Add event listener for new chat creation
    const handleNewChatCreated = (event: CustomEvent) => {
      console.log('=== New chat created event received ===')
      console.log('Event detail:', event.detail)
      const { chat } = event.detail
      
      if (chat) {
        console.log(`Adding new chat ${chat.id} with title: ${chat.title}`)
        // Add new chat to the beginning of today's group
        setChatGroups(prevGroups => {
          const newChatItem: ChatItem = {
            id: chat.id,
            title: chat.title,
            time: new Date(chat.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timeAgo: 'Just now'
          }
          
          // Find or create today's group
          const todayLabel = lang('sidebar.chatGroups.today')
          const existingTodayIndex = prevGroups.findIndex(group => group.label === todayLabel)
          
          if (existingTodayIndex >= 0) {
            // Add to existing today group
            const updatedGroups = [...prevGroups]
            updatedGroups[existingTodayIndex] = {
              ...updatedGroups[existingTodayIndex],
              items: [newChatItem, ...updatedGroups[existingTodayIndex].items]
            }
            return updatedGroups
          } else {
            // Create new today group
            return [
              { label: todayLabel, items: [newChatItem] },
              ...prevGroups
            ]
          }
        })
      }
    }

    // Add event listener for chat title updates
    const handleChatTitleUpdate = (event: CustomEvent) => {
      console.log('=== Chat title update event received ===')
      console.log('Event detail:', event.detail)
      console.log('Event type:', event.type)
      console.log('Current chat groups count:', chatGroups.length)
      
      const { chatId, title } = event.detail
      
      if (chatId && title) {
        console.log(`Updating title for chat ${chatId} to: ${title}`)
        
        // Log current groups before update
        console.log('Current groups before update:', chatGroups.map(g => ({
          label: g.label,
          items: g.items.map(i => ({ id: i.id, title: i.title }))
        })))
        
        // Update specific chat title in current state
        setChatGroups(prevGroups => {
          const updatedGroups = prevGroups.map(group => ({
            ...group,
            items: group.items.map(item => {
              const matches = String(item.id) === String(chatId)
              console.log(`Comparing item ${item.id} with chatId ${chatId}: ${matches}`)
              return matches ? { ...item, title: title } : item
            })
          }))
          
          console.log('Updated chat groups:', updatedGroups.map(g => ({
            label: g.label,
            items: g.items.map(i => ({ id: i.id, title: i.title }))
          })))
          
          return updatedGroups
        })
        
        console.log('Title update completed')
      } else {
        console.log('Missing chatId or title, refreshing entire list')
        console.log('chatId:', chatId, 'title:', title)
        // Fallback: refresh entire list
        if (session?.user?.id) {
          fetchChatSessions()
        }
      }
    }

    if (typeof window !== 'undefined') {
      console.log('Adding event listeners for chat management')
      window.addEventListener('newChatCreated', handleNewChatCreated as EventListener)
      window.addEventListener('chatTitleUpdated', handleChatTitleUpdate as EventListener)
    }

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        console.log('Cleaning up sidebar event listeners')
        delete (window as any).refreshSidebar
        window.removeEventListener('newChatCreated', handleNewChatCreated as EventListener)
        window.removeEventListener('chatTitleUpdated', handleChatTitleUpdate as EventListener)
      }
    }
  }, [session?.user?.id, initialChatSessions.length])

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-60"} bg-[#f5f5f5] border-r border-gray-200 flex-col transition-all duration-300 hidden md:flex overflow-hidden`}
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
              <TransitionLink href="/chat">
                <Button variant="ghost" size="icon" className="h-8 w-8 focus:outline-none focus:ring-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </TransitionLink>
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
                  className="flex items-center gap-1"
                >
                  
                  {/* Logo */}
                  <Image
                    src="/images/logo.svg"
                    alt="Logo"
                    width={130}
                    height={24}
                    priority
                    className="h-8 w-auto"
                  />

                  <div className={`overflow-hidden ml-1 transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <span className="whitespace-nowrap text-gray-500 text-sm">{branding.appName}</span>
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
                <Input 
                  placeholder={lang('sidebar.searchPlaceholder')} 
                  className="pl-10 pr-8 bg-white border-gray-200 focus:outline-none focus:ring-0 focus:border-gray-300" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-gray-100"
                    onClick={clearSearch}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* New Chat Button */}
            <div className="px-4 mb-2">
              <TransitionLink href="/chat" className="block" onClick={() => setSelectedChatId(null)}>
                <div className="w-full flex px-2 py-2 justify-start items-center text-sm leading-relaxed rounded-lg hover:bg-gray-200">
                  <Plus className="h-4 w-4 mr-2" />
                  {lang('sidebar.newChat')}
                </div>
              </TransitionLink>
            </div>

            {/* Chat History - Grouped by Date */}
            <div className="flex-1 mt-3 overflow-y-auto">
              <div className="px-4">
                {isLoading ? (
                  <ChatHistorySkeleton />
                ) : filteredChatGroups.length > 0 ? (
                  <>
                    {searchQuery && (
                      <div className="text-xs text-gray-500 mb-3 px-2">
                        {lang('sidebar.searchResults').replace('{{count}}', filteredChatGroups.reduce((total, group) => total + group.items.length, 0).toString())}
                      </div>
                    )}
                    {filteredChatGroups.map((group, groupIndex) => (
                      <ChatGroupComponent
                        key={groupIndex}
                        group={group}
                        groupIndex={groupIndex}
                        sidebarCollapsed={sidebarCollapsed}
                        selectedChatId={selectedChatId}
                        setSelectedChatId={setSelectedChatId}
                      />
                    ))}
                  </>
                ) : searchQuery ? (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    {lang('sidebar.noSearchResults')}
                  </div>
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
          <div 
            className="absolute inset-0 bg-gray-600 bg-opacity-75 mobile-overlay" 
            onClick={() => setMobileSidebarOpen(false)}
          ></div>
          <div className="relative flex flex-col w-64 sm:w-72 h-full bg-[#f5f5f5] border-r border-gray-200 touch-scroll">
            {/* Header */}
            <div className="p-0 h-[3rem] flex items-center px-4 touch-target">
              <div className="flex items-center justify-between w-full">
                <TransitionLink 
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
                    priority
                    className="h-8 w-auto"
                  />
                  <span className="whitespace-nowrap font-semibold text-gray-500">{branding.appName}</span>
                </TransitionLink>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 touch-target focus:outline-none focus:ring-0" 
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="p-1 px-2 my-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder={lang('sidebar.searchPlaceholder')} 
                  className="pl-10 pr-8 bg-white border-gray-200 focus:outline-none focus:ring-0 focus:border-gray-300 mobile-input h-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100 touch-target"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* New Chat Button */}
            <div className="px-4 mb-2">
              <TransitionLink href="/chat" className="block" onClick={() => {
                setSelectedChatId(null)
                setMobileSidebarOpen(false)
              }}>
                <div className="w-full flex px-3 py-3 justify-start items-center text-sm leading-relaxed rounded-lg hover:bg-gray-200 touch-target">
                  <Plus className="h-4 w-4 mr-2" />
                  {lang('sidebar.newChat')}
                </div>
              </TransitionLink>
            </div>

            {/* Chat History - Grouped by Date */}
            <div className="flex-1 mt-3 overflow-y-auto touch-scroll">
              <div className="px-4">
                {isLoading ? (
                  <ChatHistorySkeleton />
                ) : filteredChatGroups.length > 0 ? (
                  <>
                    {searchQuery && (
                      <div className="text-xs text-gray-500 mb-3 px-2">
                        {lang('sidebar.searchResults').replace('{{count}}', filteredChatGroups.reduce((total, group) => total + group.items.length, 0).toString())}
                      </div>
                    )}
                    {filteredChatGroups.map((group, groupIndex) => (
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
                  </>
                ) : searchQuery ? (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    {lang('sidebar.noSearchResults')}
                  </div>
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
                <Button variant="ghost" className="w-full justify-start h-12 px-3 transition-all duration-300 focus:outline-none focus:ring-0 touch-target">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-orange-500 text-white text-xs">
                      {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 
                       session?.user?.email ? session.user.email.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium ml-3">
                    {session?.user?.name || session?.user?.email?.split('@')[0] || '사용자'}
                  </span>
                </Button>
              </AccountMenu>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Swipe Indicator */}
      <div className="md:hidden">
        <div className="swipe-indicator" />
        <div 
          className="swipe-area" 
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch.clientX < 20) {
              setMobileSidebarOpen(true);
            }
          }}
        />
      </div>
    </>
  )
}
