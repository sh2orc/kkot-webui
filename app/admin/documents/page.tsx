"use client"

import DisabledFeature from "@/components/admin/disabled-feature"
import { useTranslation } from "@/lib/i18n"

export default function DocumentsSettingsPage() {
  const { lang } = useTranslation('admin.documents')

  return (
    <DisabledFeature 
      title={lang('title')}
      description={lang('description')}
    />
  )
} 
