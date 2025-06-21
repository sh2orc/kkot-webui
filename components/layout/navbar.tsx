"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, Menu, ChevronDown, Search } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AccountMenu } from "@/components/ui/account-menu"
import LanguageSwitcher from "@/components/ui/language-switcher"
import { useTranslation } from "@/lib/i18n"

interface NavbarProps {
  title: string
  onMobileMenuClick?: () => void
}

export default function Navbar({ title, onMobileMenuClick }: NavbarProps) {
  const [selectedModel, setSelectedModel] = useState("gemma3:27b-it-qat")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { lang } = useTranslation('common')

  // /chat 페이지인지 확인
  const isChatPage = pathname.startsWith("/chat")

  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isDropdownOpen, searchQuery])

  // 모델명을 번역 키로 변환하는 함수
  const getModelTranslationKey = (modelName: string) => {
    return modelName.replace(/:/g, '_')
  }

  const models = [
    { name: "gemma3:27b-it-qat", description: lang(`navbar.models.descriptions.${getModelTranslationKey("gemma3:27b-it-qat")}`) },
    { name: "gpt-4o", description: lang('navbar.models.descriptions.gpt-4o') },
    { name: "claude-3-sonnet", description: lang('navbar.models.descriptions.claude-3-sonnet') },
    { name: "llama-3.1-70b", description: lang('navbar.models.descriptions.llama-3.1-70b') },
    { name: "mistral-large" }
  ]

  const filteredModels = models.filter((model) => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (model.description && model.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="bg-white p-0 h-12 min-h-12 max-h-12 flex items-center px-3 md:px-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onMobileMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
          {isChatPage && (
            <DropdownMenu onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-semibold p-0 h-auto hover:bg-transparent">
                  {selectedModel}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="start">
                <div className="p-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      placeholder={lang('navbar.models.searchPlaceholder')}
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredModels.map((model) => (
                    <DropdownMenuItem
                      key={model.name}
                      onClick={() => {
                        setSelectedModel(model.name)
                        setSearchQuery("")
                      }}
                      className={selectedModel === model.name ? "bg-blue-50 text-blue-700" : ""}
                    >
                      <div className="flex flex-col items-start">
                        <div className="font-medium">{model.name}</div>
                        {model.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {filteredModels.length === 0 && (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      {lang('navbar.models.noResults')}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
