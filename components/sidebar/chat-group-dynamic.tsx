"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Edit2, Trash2, Check, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/lib/i18n"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
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
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const handleChatClick = (item: ChatItem) => {
    // Don't navigate if we're editing
    if (editingId === item.id) return
    
    setSelectedChatId(item.id)
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
  }

  const handleStartEdit = (item: ChatItem) => {
    setEditingId(item.id)
    setEditingTitle(item.title)
    setOpenMenuId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const handleSaveEdit = async (item: ChatItem) => {
    if (!session?.user?.id) {
      toast.error("User authentication required")
      return
    }

    if (!editingTitle.trim() || editingTitle.trim() === item.title) {
      handleCancelEdit()
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/chat/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingTitle.trim(),
          userId: session.user.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Chat title has been updated")
        
        // Update the title in the UI by dispatching an event
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('chatTitleUpdated', {
            detail: { chatId: item.id, title: data.title }
          })
          window.dispatchEvent(event)
        }
        
        handleCancelEdit()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update title")
      }
    } catch (error) {
      console.error('Error updating chat title:', error)
      toast.error("An error occurred while updating the title")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteChat = async (item: ChatItem) => {
    if (!session?.user?.id) {
      toast.error("User authentication required")
      return
    }

    if (!confirm("Are you sure you want to delete this chat?")) {
      return
    }

    try {
      const response = await fetch(`/api/chat/${item.id}?userId=${session.user.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success("Chat has been deleted")
        
        // If the deleted chat is currently being viewed, redirect to new chat
        if (selectedChatId === item.id || pathname === `/chat/${item.id}`) {
          router.push('/chat')
        }
        
        // Refresh the sidebar
        if (typeof window !== 'undefined' && (window as any).refreshSidebar) {
          (window as any).refreshSidebar()
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to delete chat")
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast.error("An error occurred while deleting the chat")
    }
    
    setOpenMenuId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, item: ChatItem) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
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
              <div key={itemIndex} className="relative">
                {editingId === item.id ? (
                  // Edit mode
                  <div className="flex items-center p-2 bg-gray-50 rounded">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      className="flex-1 h-7 text-sm px-2 pr-2"
                      placeholder="Enter chat title"
                      autoFocus
                      disabled={isUpdating}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleSaveEdit(item)}
                      disabled={isUpdating}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  // Normal mode
                  <TransitionLink
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
                            <DropdownMenuItem 
                              onSelect={(e) => {
                                e.preventDefault()
                                handleStartEdit(item)
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              <span>{lang("sidebar.chatActions.rename")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600" 
                              onSelect={(e) => {
                                e.preventDefault()
                                handleDeleteChat(item)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span>{lang("sidebar.chatActions.delete")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </TransitionLink>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChatGroupDynamic 