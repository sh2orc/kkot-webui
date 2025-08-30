'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState('settings')
  const { lang } = useTranslation('admin.api')

  useEffect(() => {
    if (pathname === '/admin/api') {
      setActiveTab('settings')
    } else if (pathname === '/admin/api/key') {
      setActiveTab('keys')
    } else if (pathname === '/admin/api/usage') {
      setActiveTab('usage')
    } else if (pathname === '/admin/api/endpoint') {
      setActiveTab('endpoints')
    }
  }, [pathname])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{lang('title')}</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {lang('description')}
        </p>
      </div>

      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" asChild>
            <Link href="/admin/api">{lang('apiService.title')}</Link>
          </TabsTrigger>
          <TabsTrigger value="keys" asChild>
            <Link href="/admin/api/key">{lang('apiKeys.title')}</Link>
          </TabsTrigger>
          <TabsTrigger value="usage" asChild>
            <Link href="/admin/api/usage">{lang('usage.title')}</Link>
          </TabsTrigger>
          <TabsTrigger value="endpoints" asChild>
            <Link href="/admin/api/endpoint">{lang('endpoints.title')}</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {children}
    </div>
  )
} 