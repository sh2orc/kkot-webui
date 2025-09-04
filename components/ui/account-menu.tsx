"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Archive, Shield, LogOut } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"

interface AccountMenuProps {
  children: React.ReactNode
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
}

export function AccountMenu({ children, align = "start", side = "top" }: AccountMenuProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { lang } = useTranslation("common")
  const [userGroups, setUserGroups] = useState<string[]>([])
  
  useEffect(() => {
    if (session?.user?.id) {
      // Fetch user's groups
      fetch(`/api/users/${session.user.id}/groups`)
        .then(res => res.json())
        .then(data => {
          if (data.groups) {
            setUserGroups(data.groups.map((g: any) => g.name))
          }
        })
        .catch(err => console.error("Failed to fetch user groups:", err))
    }
  }, [session?.user?.id])

  const handleLogout = async () => {
    try {
      // First navigate to /auth (add logout parameter)
      router.push('/auth?logout=true')
      
      // Then handle logout
      await signOut({
        redirect: false
      })
      
      toast.success('Logged out successfully.')
      
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('An error occurred during logout.')
      
      // Navigate to /auth even if error occurs
      router.push('/auth?logout=true')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align={align} side={side}>
        {session?.user && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="!text-sm font-medium leading-none">
                  {session.user.name || session.user.email?.split('@')[0]}
                </p>
                <p className="!text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
                {(session.user.role || userGroups.length > 0) && (
                  <p className="!text-xs leading-none text-muted-foreground">
                    {session.user.role === 'admin' 
                      ? lang("roles.admin") 
                      : userGroups.length > 0 
                        ? userGroups.join(", ")
                        : lang("roles.user")}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => router.push("/setting")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{lang("accountContextMenu.settings")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Archive className="mr-2 h-4 w-4" />
          <span>{lang("accountContextMenu.archivedChats")}</span>
        </DropdownMenuItem>
        {session?.user?.role === 'admin' && (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            <Shield className="mr-2 h-4 w-4" />
            <span>{lang("accountContextMenu.adminSettings")}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{lang("accountContextMenu.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
