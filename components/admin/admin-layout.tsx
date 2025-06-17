"use client"

import { Button } from "@/components/ui/button"
import {
  Settings,
  Link,
  Brain,
  BarChart3,
  Wrench,
  FileText,
  Search,
  ImageIcon,
  Volume2,
  GitBranch,
  Database,
} from "lucide-react"
import Layout from "../layout/layout"
import { useRouter, usePathname } from "next/navigation"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    { id: "general", label: "일반", icon: Settings, path: "/admin/general" },
    { id: "connection", label: "연결", icon: Link, path: "/admin/connection" },
    { id: "model", label: "모델", icon: Brain, path: "/admin/model" },
    { id: "evaluation", label: "평가", icon: BarChart3, path: "/admin/evaluation" },
    { id: "tools", label: "도구", icon: Wrench, path: "/admin/tools" },
    { id: "documents", label: "문서", icon: FileText, path: "/admin/documents" },
    { id: "websearch", label: "웹검색", icon: Search, path: "/admin/websearch" },
    { id: "image", label: "이미지", icon: ImageIcon, path: "/admin/image" },
    { id: "audio", label: "오디오", icon: Volume2, path: "/admin/audio" },
    { id: "pipeline", label: "파이프라인", icon: GitBranch, path: "/admin/pipeline" },
    { id: "database", label: "데이터베이스", icon: Database, path: "/admin/database" },
  ]

  return (
    <Layout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">관리자 설정</h2>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      pathname === item.path
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl">
            {children}
          </div>
        </div>
      </div>
    </Layout>
  )
} 