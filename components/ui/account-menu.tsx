"use client"

import type React from "react"

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

  const handleLogout = async () => {
    try {
      // Handle logout manually without using redirect option
      const result = await signOut({
        redirect: false
      })
      
      // Manually redirect on success
      toast.success('Logged out successfully.')
      
      // Redirect after short delay (to allow toast message to be seen)
      setTimeout(() => {
        router.push('/auth')
        router.refresh()
      }, 1000)
      
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('An error occurred during logout.')
      
      // Force redirect even if error occurs
      setTimeout(() => {
        router.push('/auth')
        router.refresh()
      }, 1000)
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
                <p className="text-sm font-medium leading-none">
                  {session.user.name || session.user.email?.split('@')[0]}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
                {session.user.role && (
                  <p className="text-xs leading-none text-muted-foreground">
                    Role: {session.user.role === 'admin' ? 'Administrator' : 'User'}
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
