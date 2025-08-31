"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Edit2, Trash2, Check, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { useState, useEffect } from "react"
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
  const { lang, language } = useTranslation("common")
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ChatItem | null>(null)

  // Preload common translation module
  useEffect(() => {
    preloadTranslationModule(language, "common")
  }, [language])

  const handleChatClick = (item: ChatItem, e?: React.MouseEvent) => {
    // Don't navigate if we're editing or if dropdown is open
    if (editingId === item.id || openMenuId === item.id) {
      e?.preventDefault()
      e?.stopPropagation()
      return
    }
    
    setSelectedChatId(item.id)
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
    
    // Navigate to the chat
    router.push(`/chat/${item.id}`)
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
    if (!editingTitle.trim() || editingTitle.trim() === item.title) {
      handleCancelEdit()
      return
    }

    if (!session?.user?.id) {
      toast.error(lang("sidebar.messages.userAuthRequired"))
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
        toast.success(lang("sidebar.messages.chatTitleUpdated"))
        
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
        toast.error(errorData.error || lang("sidebar.messages.failedToUpdateTitle"))
      }
    } catch (error) {
      console.error('Error updating chat title:', error)
      toast.error(lang("sidebar.messages.errorUpdatingTitle"))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteChatClick = (item: ChatItem, e?: Event) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    setItemToDelete(item)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleDeleteChat = async () => {
    if (!itemToDelete || !session?.user?.id) {
      toast.error(lang("sidebar.messages.userAuthRequired"))
      return
    }

    try {
      const response = await fetch(`/api/chat/${itemToDelete.id}?userId=${session.user.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success(lang("sidebar.messages.chatDeleted"))
        
        // If the deleted chat is currently being viewed, redirect to new chat
        if (selectedChatId === itemToDelete.id || pathname === `/chat/${itemToDelete.id}`) {
          router.push('/chat')
        }
        
        // Refresh the sidebar
        if (typeof window !== 'undefined' && (window as any).refreshSidebar) {
          (window as any).refreshSidebar()
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || lang("sidebar.messages.failedToDeleteChat"))
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast.error(lang("sidebar.messages.errorDeletingChat"))
    }
    
    setDeleteDialogOpen(false)
    setItemToDelete(null)
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
    <div key={groupIndex} className="mb-4">
      <div
        className={`text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 transition-opacity duration-200 ${
          sidebarCollapsed ? "opacity-0" : "opacity-100"
        }`}
      >
        {group.label}
      </div>
      <div className="space-y-1 overflow-hidden">
        {group.items.map((item) => (
          <div key={item.id} className="relative">
            {editingId === item.id ? (
              // Edit mode
              <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  className="flex-1 h-7 text-sm px-2 pr-2"
                  placeholder={lang("sidebar.placeholders.enterChatTitle")}
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
              <div
                className="block"
                onClick={(e) => {
                  // Only navigate if not interacting with dropdown
                  if (openMenuId !== item.id) {
                    handleChatClick(item, e)
                  }
                }}
              >
                <div
                  className={`group flex items-center justify-between p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-opacity duration-200 px-2 ${
                    sidebarCollapsed ? "opacity-0" : "opacity-100"
                  } ${selectedChatId === item.id ? "bg-gray-200 dark:bg-gray-800" : ""}`}
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">{item.title}</span>
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
                            e.stopPropagation()
                            handleStartEdit(item)
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          <span>{lang("sidebar.chatActions.rename")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600" 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteChatClick(item, e as unknown as Event)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          <span>{lang("sidebar.chatActions.delete")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang("sidebar.dialogs.deleteChat.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang("sidebar.dialogs.deleteChat.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang("sidebar.dialogs.deleteChat.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              className="bg-red-600 hover:bg-red-700"
            >
              {lang("sidebar.dialogs.deleteChat.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
