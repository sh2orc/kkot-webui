"use client"

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
import { useTranslation } from "@/lib/i18n"

export default function AdminPage() {
  const { lang } = useTranslation('admin')
  const quickLinks = [
    { id: "general", label: lang('dashboard.quickLinks.general.label'), icon: Settings, path: "/admin/general", description: lang('dashboard.quickLinks.general.description') },
    { id: "connection", label: lang('dashboard.quickLinks.connection.label'), icon: Link, path: "/admin/connection", description: lang('dashboard.quickLinks.connection.description') },
    { id: "model", label: lang('dashboard.quickLinks.model.label'), icon: Brain, path: "/admin/model", description: lang('dashboard.quickLinks.model.description') },
    { id: "mcp", label: lang('dashboard.quickLinks.mcp.label'), icon: Server, path: "/admin/mcp", description: lang('dashboard.quickLinks.mcp.description') },
    { id: "evaluation", label: lang('dashboard.quickLinks.evaluation.label'), icon: BarChart3, path: "/admin/evaluation", description: lang('dashboard.quickLinks.evaluation.description') },
    { id: "tools", label: lang('dashboard.quickLinks.tools.label'), icon: Wrench, path: "/admin/tools", description: lang('dashboard.quickLinks.tools.description') },
    { id: "documents", label: lang('dashboard.quickLinks.documents.label'), icon: FileText, path: "/admin/documents", description: lang('dashboard.quickLinks.documents.description') },
    { id: "websearch", label: lang('dashboard.quickLinks.websearch.label'), icon: Search, path: "/admin/websearch", description: lang('dashboard.quickLinks.websearch.description') },
    { id: "image", label: lang('dashboard.quickLinks.image.label'), icon: ImageIcon, path: "/admin/image", description: lang('dashboard.quickLinks.image.description') },
    { id: "audio", label: lang('dashboard.quickLinks.audio.label'), icon: Volume2, path: "/admin/audio", description: lang('dashboard.quickLinks.audio.description') },
    { id: "pipeline", label: lang('dashboard.quickLinks.pipeline.label'), icon: GitBranch, path: "/admin/pipeline", description: lang('dashboard.quickLinks.pipeline.description') },
    { id: "database", label: lang('dashboard.quickLinks.database.label'), icon: Database, path: "/admin/database", description: lang('dashboard.quickLinks.database.description') },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{lang('dashboard.title')}</h1>
          <p className="text-gray-600 mt-2">{lang('dashboard.description')}</p>
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
            <CardTitle>{lang('dashboard.systemStatus.title')}</CardTitle>
            <CardDescription>{lang('dashboard.systemStatus.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">{lang('dashboard.systemStatus.openai')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">{lang('dashboard.systemStatus.ollama')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">{lang('dashboard.systemStatus.websearch')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
