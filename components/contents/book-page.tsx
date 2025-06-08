"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Share, Bookmark, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Layout from "../layout/layout"

export default function ContentPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체")

  // Sample content data for masonry layout
  const contentItems = [
    {
      id: 1,
      title: "AI 기반 마케팅 전략",
      description: "인공지능을 활용한 효과적인 마케팅 방법론과 실제 적용 사례들을 살펴보겠습니다.",
      category: "마케팅",
      readTime: "5분",
      likes: 24,
      comments: 8,
      height: "h-64",
    },
    {
      id: 2,
      title: "데이터 분석 기초",
      description: "비즈니스 의사결정을 위한 데이터 분석의 기본 개념과 도구 활용법",
      category: "데이터",
      readTime: "8분",
      likes: 42,
      comments: 15,
      height: "h-48",
    },
    {
      id: 3,
      title: "UX/UI 디자인 트렌드 2024",
      description:
        "올해 주목해야 할 사용자 경험 디자인 트렌드와 실무 적용 방안을 소개합니다. 모바일 퍼스트 접근법부터 접근성 개선까지 다양한 주제를 다룹니다.",
      category: "디자인",
      readTime: "12분",
      likes: 67,
      comments: 23,
      height: "h-72",
    },
    {
      id: 4,
      title: "블록체인 기술 이해하기",
      description: "블록체인의 기본 원리와 실제 활용 사례",
      category: "기술",
      readTime: "6분",
      likes: 31,
      comments: 12,
      height: "h-56",
    },
    {
      id: 5,
      title: "원격 근무 생산성 향상법",
      description: "재택근무 환경에서 효율성을 극대화하는 방법들",
      category: "업무",
      readTime: "4분",
      likes: 18,
      comments: 6,
      height: "h-52",
    },
    {
      id: 6,
      title: "스타트업 투자 가이드",
      description:
        "초기 스타트업을 위한 투자 유치 전략과 피치덱 작성법을 상세히 설명합니다. 엔젤 투자자부터 VC까지 다양한 투자 단계별 접근 방법을 알아보세요.",
      category: "투자",
      readTime: "15분",
      likes: 89,
      comments: 34,
      height: "h-68",
    },
    {
      id: 7,
      title: "머신러닝 입문",
      description: "기계학습의 기본 개념과 실습 예제",
      category: "AI",
      readTime: "10분",
      likes: 56,
      comments: 19,
      height: "h-60",
    },
    {
      id: 8,
      title: "소셜미디어 마케팅",
      description: "SNS를 활용한 브랜드 마케팅 전략",
      category: "마케팅",
      readTime: "7분",
      likes: 33,
      comments: 11,
      height: "h-54",
    },
  ]

  return (
    <Layout currentPage="content">
      {/* Content Area with Masonry Layout */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 md:px-0">
          {/* Filter Tabs */}
          <div className="mb-3 sm:mb-4 md:mb-6">
            {/* Mobile Dropdown */}
            <div className="block sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedCategory}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setSelectedCategory("전체")}>전체</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("마케팅")}>마케팅</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("데이터")}>데이터</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("디자인")}>디자인</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("기술")}>기술</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("업무")}>업무</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("투자")}>투자</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("AI")}>AI</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden sm:flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Badge
                variant={selectedCategory === "전체" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "전체" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("전체")}
              >
                전체
              </Badge>
              <Badge
                variant={selectedCategory === "마케팅" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "마케팅" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("마케팅")}
              >
                마케팅
              </Badge>
              <Badge
                variant={selectedCategory === "데이터" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "데이터" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("데이터")}
              >
                데이터
              </Badge>
              <Badge
                variant={selectedCategory === "디자인" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "디자인" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("디자인")}
              >
                디자인
              </Badge>
              <Badge
                variant={selectedCategory === "기술" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "기술" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("기술")}
              >
                기술
              </Badge>
              <Badge
                variant={selectedCategory === "업무" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "업무" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("업무")}
              >
                업무
              </Badge>
              <Badge
                variant={selectedCategory === "투자" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "투자" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("투자")}
              >
                투자
              </Badge>
              <Badge
                variant={selectedCategory === "AI" ? "default" : "outline"}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  selectedCategory === "AI" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedCategory("AI")}
              >
                AI
              </Badge>
            </div>
          </div>

          {/* Masonry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {contentItems.map((item) => (
              <Card
                key={item.id}
                className="h-96 hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col"
              >
                <div className="relative">
                  <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    <div className="text-center p-4">
                      <div className="text-2xl mb-2">📚</div>
                      <div className="text-sm text-gray-600 font-medium">{item.category}</div>
                    </div>
                    {/* 그라데이션 오버레이 - 더 뚜렷하게 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-white/10 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/20 pointer-events-none"></div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 md:h-8 md:w-8 bg-white/80 hover:bg-white"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>

                <CardHeader className="pb-3 px-3 md:px-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[10px] md:text-xs">
                      {item.category}
                    </Badge>
                    <span className="text-xs text-gray-500">{item.readTime}</span>
                  </div>
                  <CardTitle className="text-base md:text-lg leading-tight line-clamp-2 overflow-hidden">
                    <span className="block overflow-hidden text-ellipsis" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden'
                    }}>
                      {item.title}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 px-3 md:px-6 flex-1 flex flex-col justify-between">
                  <p className="text-gray-600 text-xs md:text-sm mb-4 leading-relaxed overflow-hidden">
                    <span style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden'
                    }}>
                      {item.description}
                    </span>
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span>{item.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span>{item.comments}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
