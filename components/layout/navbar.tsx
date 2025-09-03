"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, Menu, MessageSquare, Shield, Cog, Monitor, Command } from "lucide-react"
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
              className="flex items-center gap-2 flex-shrink-0 cursor-pointer group"
              onClick={() => router.push("/admin")}
            >
              <div className="relative">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {lang('admin.dashboard')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  {lang('admin.console')}
                </span>
              </div>
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

/* 
============= ADMIN NAVBAR 스타일 옵션들 =============

// 옵션 1: 현재 적용된 스타일 (Shield + 2줄 텍스트 + 펄스 효과)
{isAdminPage && (
  <div 
    className="flex items-center gap-2 flex-shrink-0 cursor-pointer group"
    onClick={() => router.push("/admin")}
  >
    <div className="relative">
      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
    </div>
    <div className="flex flex-col">
      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {lang('admin.dashboard')}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
        {lang('admin.console')}
      </span>
    </div>
  </div>
)}

// 옵션 2: 미니멀 스타일 (Command 아이콘 + 단일 텍스트)
{isAdminPage && (
  <div 
    className="flex items-center gap-2 flex-shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-md transition-colors"
    onClick={() => router.push("/admin")}
  >
    <Command className="h-4 w-4 text-purple-600 dark:text-purple-400" />
    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
      {lang('admin.controlCenter')}
    </span>
  </div>
)}

// 옵션 3: 카드 스타일 (배경 + 그라데이션)
{isAdminPage && (
  <div 
    className="flex items-center gap-2 flex-shrink-0 cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all"
    onClick={() => router.push("/admin")}
  >
    <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
      {lang('admin.dashboard')}
    </span>
  </div>
)}

// 옵션 4: 버튼 스타일 (Button 컴포넌트 사용)
{isAdminPage && (
  <Button 
    variant="outline" 
    size="sm" 
    className="gap-2 flex-shrink-0 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/20" 
    onClick={() => router.push("/admin")}
  >
    <Cog className="h-4 w-4" />
    {lang('admin.settings')}
  </Button>
)}

// 옵션 5: 뱃지 스타일 (Badge + 아이콘)
{isAdminPage && (
  <div 
    className="flex items-center gap-2 flex-shrink-0 cursor-pointer bg-orange-100 dark:bg-orange-900/20 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
    onClick={() => router.push("/admin")}
  >
    <Shield className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
    <span className="font-medium text-orange-900 dark:text-orange-100 text-xs">
      ADMIN
    </span>
  </div>
)}

==================================================
*/
