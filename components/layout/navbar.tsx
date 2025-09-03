"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, Menu, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { AccountMenu } from "@/components/ui/account-menu"
import LanguageSwitcher from "@/components/ui/language-switcher"
import { useTranslation } from "@/lib/i18n"
import { ModelDropdown } from "@/components/ui/model-dropdown"
import { useModel } from "@/components/providers/model-provider"
import { useBranding } from "@/components/providers/branding-provider"
import { useProfile } from "@/components/providers/profile-provider"
import Image from "next/image"

interface NavbarProps {
  title: string
  onMobileMenuClick?: () => void
}

export default function Navbar({ title, onMobileMenuClick }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { lang } = useTranslation('common')
  const { selectedModel } = useModel()
  const { branding } = useBranding()
  const { profileImage, userProfile } = useProfile()

  // Check if current page is /chat
  const isChatPage = pathname.startsWith("/chat")
  
  // Check if current page is /admin
  const isAdminPage = pathname.startsWith("/admin")

  // Generate user avatar text
  const getAvatarText = () => {
    if (userProfile?.username) {
      return userProfile.username.charAt(0).toUpperCase()
    }
    if (session?.user?.name) {
      return session.user.name.charAt(0).toUpperCase()
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase()
    }
    return 'U' // Default value
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-0 h-12 min-h-12 max-h-12 flex items-center px-2 sm:px-3 md:px-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:hidden flex-shrink-0" 
            onClick={onMobileMenuClick}
          >
            <Menu className="h-4 w-4" />
          </Button>
          {isAdminPage && (
            <div 
              className="flex items-center gap-2 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push("/admin")}
            >
              <Image 
                src="/images/logo.svg" 
                alt="Logo" 
                width={24} 
                height={24} 
                className="h-6 w-6"
              />
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lang('adminSettings')}</span>
            </div>
          )}
          {isChatPage && (
            <div className="flex-1 min-w-0 max-w-[200px] sm:max-w-[240px] md:max-w-[240px] lg:w-60">
              <ModelDropdown />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          {!isChatPage && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 flex-shrink-0" 
              onClick={() => router.push("/chat")}
              title={lang('goToChat')}
            >
              <MessageSquare className="h-4 w-4" />
              {lang('chat')}
            </Button>
          )}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 flex-shrink-0" 
              onClick={() => router.push("/setting")}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <AccountMenu align="end" side="bottom">
              <Avatar className="h-8 w-8 cursor-pointer flex-shrink-0">
                {profileImage ? (
                  <AvatarImage src={profileImage} alt="Profile" />
                ) : (
                  <AvatarFallback className="bg-orange-500 text-white !text-xs">
                    {getAvatarText()}
                  </AvatarFallback>
                )}
              </Avatar>
            </AccountMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
