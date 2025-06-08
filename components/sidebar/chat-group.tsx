"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

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

interface ChatGroupProps {
  group: ChatGroup
  groupIndex: number
  sidebarCollapsed: boolean
  selectedChatId: string | null
  setSelectedChatId: (id: string) => void
  setMobileSidebarOpen?: (open: boolean) => void
  isMobile?: boolean
}

export function ChatGroupComponent({
  group,
  groupIndex,
  sidebarCollapsed,
  selectedChatId,
  setSelectedChatId,
  setMobileSidebarOpen,
  isMobile = false,
}: ChatGroupProps) {
  const router = useRouter()

  const handleChatClick = (item: ChatItem) => {
    setSelectedChatId(item.id)
    router.push(`/chat/${item.id}`)
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
  }

  return (
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
          <div
            key={itemIndex}
            className={`group flex items-center justify-between p-1 hover:bg-gray-100 rounded cursor-pointer transition-opacity duration-200 ${
              sidebarCollapsed ? "opacity-0" : "opacity-100"
            } ${selectedChatId === item.id ? "bg-blue-50" : ""}`}
            onClick={() => handleChatClick(item)}
          >
            <span className="text-sm text-gray-700 truncate flex-1">{item.title}</span>
            {(selectedChatId === item.id || selectedChatId !== item.id) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ml-2 ${
                      selectedChatId === item.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    } transition-opacity`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <span>이름 변경</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>보관하기</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>공유하기</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <span>삭제하기</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
