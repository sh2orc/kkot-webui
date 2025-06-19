import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Server,
} from "lucide-react"

export default function AdminPage() {
  const quickLinks = [
    { id: "general", label: "일반 설정", icon: Settings, path: "/admin/general", description: "기본 시스템 설정 및 JWT 관리" },
    { id: "connection", label: "연결 설정", icon: Link, path: "/admin/connection", description: "API 서버 연결 관리" },
    { id: "model", label: "모델 설정", icon: Brain, path: "/admin/model", description: "AI 모델 구성 및 관리" },
    { id: "mcp", label: "MCP 설정", icon: Server, path: "/admin/mcp", description: "Model Context Protocol 서버 관리" },
    { id: "evaluation", label: "평가 설정", icon: BarChart3, path: "/admin/evaluation", description: "성능 평가 및 모니터링" },
    { id: "tools", label: "도구 설정", icon: Wrench, path: "/admin/tools", description: "외부 도구 및 플러그인" },
    { id: "documents", label: "문서 설정", icon: FileText, path: "/admin/documents", description: "문서 관리 및 인덱싱" },
    { id: "websearch", label: "웹검색 설정", icon: Search, path: "/admin/websearch", description: "실시간 인터넷 검색" },
    { id: "image", label: "이미지 설정", icon: ImageIcon, path: "/admin/image", description: "이미지 생성 서비스" },
    { id: "audio", label: "오디오 설정", icon: Volume2, path: "/admin/audio", description: "음성 처리 및 합성" },
    { id: "pipeline", label: "파이프라인 설정", icon: GitBranch, path: "/admin/pipeline", description: "워크플로우 관리" },
    { id: "database", label: "데이터베이스 설정", icon: Database, path: "/admin/database", description: "데이터베이스 구성" },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">관리자 대시보드</h1>
          <p className="text-gray-600 mt-2">시스템 설정 및 관리를 위한 대시보드입니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Card key={link.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <a href={link.path}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{link.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{link.description}</CardDescription>
                  </CardContent>
                </a>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>시스템 상태</CardTitle>
            <CardDescription>현재 시스템의 상태를 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">OpenAI API: 연결됨</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Ollama: 설정 필요</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">웹검색: 비활성화</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
