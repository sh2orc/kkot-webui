"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Share, Bookmark, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import Loading from "@/components/ui/loading"

export default function ContentPage() {
  const { lang, language } = useTranslation('book')
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isLoaded, setIsLoaded] = useState(false)

  // 번역 모듈 프리로드
  useEffect(() => {
    async function loadTranslations() {
      await preloadTranslationModule(language, 'book')
      setIsLoaded(true)
    }
    loadTranslations()
  }, [language])

  // Sample content data for masonry layout
  const contentItems = [
    {
      id: 1,
      title: lang('content.item1.title'),
      description: lang('content.item1.description'),
      category: lang('content.item1.category'),
      readTime: lang('content.item1.readTime'),
      likes: 24,
      comments: 8,
      height: "h-64",
    },
    {
      id: 2,
      title: lang('content.item2.title'),
      description: lang('content.item2.description'),
      category: lang('content.item2.category'),
      readTime: lang('content.item2.readTime'),
      likes: 42,
      comments: 15,
      height: "h-48",
    },
    {
      id: 3,
      title: lang('content.item3.title'),
      description: lang('content.item3.description'),
      category: lang('content.item3.category'),
      readTime: lang('content.item3.readTime'),
      likes: 67,
      comments: 23,
      height: "h-72",
    },
    {
      id: 4,
      title: lang('content.item4.title'),
      description: lang('content.item4.description'),
      category: lang('content.item4.category'),
      readTime: lang('content.item4.readTime'),
      likes: 31,
      comments: 12,
      height: "h-56",
    },
    {
      id: 5,
      title: lang('content.item5.title'),
      description: lang('content.item5.description'),
      category: lang('content.item5.category'),
      readTime: lang('content.item5.readTime'),
      likes: 18,
      comments: 6,
      height: "h-52",
    },
    {
      id: 6,
      title: lang('content.item6.title'),
      description: lang('content.item6.description'),
      category: lang('content.item6.category'),
      readTime: lang('content.item6.readTime'),
      likes: 89,
      comments: 34,
      height: "h-68",
    },
    {
      id: 7,
      title: lang('content.item7.title'),
      description: lang('content.item7.description'),
      category: lang('content.item7.category'),
      readTime: lang('content.item7.readTime'),
      likes: 56,
      comments: 19,
      height: "h-60",
    },
    {
      id: 8,
      title: lang('content.item8.title'),
      description: lang('content.item8.description'),
      category: lang('content.item8.category'),
      readTime: lang('content.item8.readTime'),
      likes: 33,
      comments: 11,
      height: "h-54",
    },
  ]

  const categories = [
    { key: "all", label: lang('categories.all') },
    { key: "marketing", label: lang('categories.marketing') },
    { key: "data", label: lang('categories.data') },
    { key: "design", label: lang('categories.design') },
    { key: "technology", label: lang('categories.technology') },
    { key: "work", label: lang('categories.work') },
    { key: "investment", label: lang('categories.investment') },
    { key: "ai", label: lang('categories.ai') },
  ]

  if (!isLoaded) {
    return <Loading className="flex-1" fullScreen={false} />
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto px-1 sm:px-2 md:px-0">
        {/* Filter Tabs */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          {/* Mobile Dropdown */}
          <div className="block sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {categories.find(cat => cat.key === selectedCategory)?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {categories.map((category) => (
                  <DropdownMenuItem 
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                  >
                    {category.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden sm:flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <Badge
                key={category.key}
                variant={selectedCategory === category.key ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === category.key ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory(category.key)}
              >
                {category.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {contentItems
            .filter((item) => selectedCategory === "all" || item.category === selectedCategory)
            .map((item) => (
              <Card
                key={item.id}
                className="bg-white hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-200 hover:border-gray-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg font-semibold leading-tight line-clamp-2">
                      {item.title}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">{item.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">{item.category}</span>
                    <span>{item.readTime}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-red-500 hover:bg-red-50">
                        <Heart className="h-4 w-4 mr-1" />
                        {item.likes}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {item.comments}
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-green-500 hover:bg-green-50">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
