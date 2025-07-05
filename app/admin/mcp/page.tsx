"use client"

import AdminLayout from "@/components/admin/admin-layout"
import DisabledFeature from "@/components/admin/disabled-feature"
import { useTranslation } from "@/lib/i18n"

export default function MCPSettingsPage() {
  const { lang } = useTranslation('admin.mcp')

  return (
    <AdminLayout>
      <DisabledFeature 
        title={lang('title')} 
        description={lang('description')} 
      />
    </AdminLayout>
  )
} 
