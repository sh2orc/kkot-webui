"use client"

import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n"

export default function PipelineSettingsPage() {
  const { lang } = useTranslation('admin.pipeline')

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
            <p className="text-gray-500">파이프라인 설정 기능은 개발 중입니다.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 
