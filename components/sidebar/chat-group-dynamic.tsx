"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/lib/i18n"
import { useState } from "react"
import TransitionLink from "@/components/ui/transition-link"

interface ChatItem {
  id: string
  title: string
  time: string
  timeAgo: string
}

interface ChatGroup {
  label: string
  items: ChatItem[]
}

interface ChatGroupDynamicProps {
  groups: ChatGroup[]
  sidebarCollapsed: boolean
  selectedChatId: string | null
  setSelectedChatId: (id: string) => void
  setMobileSidebarOpen?: (open: boolean) => void
  isMobile?: boolean
}

export function ChatGroupDynamic({
  groups,
  sidebarCollapsed,
  selectedChatId,
  setSelectedChatId,
  setMobileSidebarOpen,
  isMobile = false,
}: ChatGroupDynamicProps) {
  const { lang } = useTranslation("common")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleChatClick = (item: ChatItem) => {
    setSelectedChatId(item.id)
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-4">
          <div
            className={`text-xs font-medium text-gray-500 mb-1 transition-opacity duration-200 ${
              sidebarCollapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            {group.label}
          </div>
          <div className="space-y-1 overflow-hidden">
            {group.items.map((item, itemIndex) => (
              <TransitionLink
                key={itemIndex}
                href={`/chat/${item.id}`}
                className="block"
                onClick={() => handleChatClick(item)}
              >
                <div
                  className={`group flex items-center justify-between p-1 hover:bg-gray-100 rounded cursor-pointer transition-opacity duration-200 px-2 ${
                    sidebarCollapsed ? "opacity-0" : "opacity-100"
                  } ${selectedChatId === item.id ? "bg-gray-200" : ""}`}
                >
                  <span className="text-sm text-gray-700 truncate flex-1 min-w-0">{item.title}</span>
                  <div className="relative flex-shrink-0">
                    <DropdownMenu open={openMenuId === item.id} onOpenChange={(open) => !open && setOpenMenuId(null)}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 ml-2 ${
                            openMenuId === item.id 
                              ? "opacity-100" 
                              : selectedChatId === item.id 
                                ? "opacity-100" 
                                : "opacity-0 group-hover:opacity-100"
                          } transition-opacity`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === item.id ? null : item.id)
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={5}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <span>{lang("sidebar.chatActions.rename")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <span>{lang("sidebar.chatActions.archive")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <span>{lang("sidebar.chatActions.share")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                          <span>{lang("sidebar.chatActions.delete")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </TransitionLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChatGroupDynamic 