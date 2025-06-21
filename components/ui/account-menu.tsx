"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Archive, Shield, LogOut } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface AccountMenuProps {
  children: React.ReactNode
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
}

export function AccountMenu({ children, align = "start", side = "top" }: AccountMenuProps) {
  const router = useRouter()
  const { lang } = useTranslation("common")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align={align} side={side}>
        <DropdownMenuItem onClick={() => router.push("/setting")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{lang("accountContextMenu.settings")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Archive className="mr-2 h-4 w-4" />
          <span>{lang("accountContextMenu.archivedChats")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/admin")}>
          <Shield className="mr-2 h-4 w-4" />
          <span>{lang("accountContextMenu.adminSettings")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{lang("accountContextMenu.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
