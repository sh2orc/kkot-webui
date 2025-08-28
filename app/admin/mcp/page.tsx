"use client"

import DisabledFeature from "@/components/admin/disabled-feature"
import { useTranslation } from "@/lib/i18n"

export default function MCPSettingsPage() {
  const { lang } = useTranslation('admin.mcp')

  return (
    <DisabledFeature 
      title={lang('title')}
      description={lang('description')}
    />
  )
} 
