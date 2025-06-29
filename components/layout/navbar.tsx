"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AccountMenu } from "@/components/ui/account-menu"
import LanguageSwitcher from "@/components/ui/language-switcher"
import { useTranslation } from "@/lib/i18n"
import { ModelDropdown } from "@/components/ui/model-dropdown"
import { useModel } from "@/components/providers/model-provider"

interface NavbarProps {
  title: string
  onMobileMenuClick?: () => void
}

export default function Navbar({ title, onMobileMenuClick }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { lang } = useTranslation('common')
  const { selectedModel } = useModel()

  // /chat 페이지인지 확인
  const isChatPage = pathname.startsWith("/chat")

  return (
    <div className="bg-white p-0 h-12 min-h-12 max-h-12 flex items-center px-3 md:px-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onMobileMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
          {isChatPage && (
            <div className="max-w-xs w-60">
              <ModelDropdown />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/setting")}>
              <Settings className="h-4 w-4" />
            </Button>
            <AccountMenu align="end" side="bottom">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="bg-orange-500 text-white text-xs">A</AvatarFallback>
              </Avatar>
            </AccountMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
