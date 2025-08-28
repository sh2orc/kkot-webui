'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AdminLayout from '@/components/admin/admin-layout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { Database, FolderOpen, Settings, Search, BookOpen } from 'lucide-react'

export default function RagLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { lang } = useTranslation('admin.rag')
  const [activeTab, setActiveTab] = useState('vector-stores')

  // Determine active tab from current path
  useEffect(() => {
    if (pathname.includes('/vector-stores')) {
      setActiveTab('vector-stores')
    } else if (pathname.includes('/collections')) {
      setActiveTab('collections')
    } else if (pathname.includes('/documents')) {
      setActiveTab('documents')
    } else if (pathname.includes('/settings')) {
      setActiveTab('settings')
    } else {
      setActiveTab('vector-stores')
    }
  }, [pathname])

  const handleTabChange = (value: string) => {
    router.push(`/admin/rag/${value}`)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{lang('title')}</h1>
            <p className="text-gray-600 mt-1">{lang('description')}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vector-stores" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.vectorStores')}</span>
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.collections')}</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.documents')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.settings')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {children}
      </div>
    </AdminLayout>
  )
}
