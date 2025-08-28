"use client"


import DisabledFeature from "@/components/admin/disabled-feature"
import { useTranslation } from "@/lib/i18n"

export default function ToolsSettingsPage() {
  const { lang } = useTranslation('admin.tools')

  return (
    <DisabledFeature 
        title={lang('title')} 
        description={lang('description')} 
    />
  )
} 
