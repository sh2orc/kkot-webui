"use client"

import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n"

export default function AudioSettingsPage() {
  const { lang } = useTranslation('admin.audio')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">{lang('description')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{lang('title')}</CardTitle>
            <CardDescription>{lang('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">?�디???�정 기능?� 개발 중입?�다.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 
