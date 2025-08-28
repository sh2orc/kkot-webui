"use client"

import { Button } from "@/components/ui/button"
import {
  Settings,
  Link,
  Bot,
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
  Terminal,
  Library,
  Users,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { lang } = useTranslation('admin')

  const menuItems = [
    { id: "general", label: lang('menu.general'), icon: Settings, path: "/admin/general" },
    { id: "users", label: lang('menu.users'), icon: Users, path: "/admin/users" },
    { id: "connection", label: lang('menu.connection'), icon: Link, path: "/admin/connection" },
    { id: "model", label: lang('menu.model'), icon: Brain, path: "/admin/model" },
    { id: "agent", label: lang('menu.agent'), icon: Bot, path: "/admin/agent" },    
    { id: "rag", label: lang('menu.rag'), icon: Library, path: "/admin/rag" },
    { id: "api", label: lang('menu.api'), icon: Terminal, path: "/admin/api" },
    { id: "database", label: lang('menu.database'), icon: Database, path: "/admin/database" },
    { id: "mcp", label: lang('menu.mcp'), icon: Server, path: "/admin/mcp", disabled: true },
    { id: "evaluation", label: lang('menu.evaluation'), icon: BarChart3, path: "/admin/evaluation", disabled: true },
    { id: "tools", label: lang('menu.tools'), icon: Wrench, path: "/admin/tools", disabled: true },
    { id: "documents", label: lang('menu.documents'), icon: FileText, path: "/admin/documents", disabled: true },
    { id: "websearch", label: lang('menu.websearch'), icon: Search, path: "/admin/websearch", disabled: true },
    { id: "image", label: lang('menu.image'), icon: ImageIcon, path: "/admin/image", disabled: true },
    { id: "audio", label: lang('menu.audio'), icon: Volume2, path: "/admin/audio", disabled: true },
    { id: "pipeline", label: lang('menu.pipeline'), icon: GitBranch, path: "/admin/pipeline", disabled: true },
  ]

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.disabled) {
      toast.warning("This feature is currently under development and not yet available.");
      return;
    }
    router.push(item.path);
  };

  return (
    <div className="flex h-full border-t border-gray-200">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">{lang('title')}</h2>
          <nav className="space-y-1">
            {menuItems
              .filter(item => !item.disabled) // Filter out disabled menu items
              .map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item)}
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
  )
} 
