"use client"

import DisabledFeature from "@/components/admin/disabled-feature"
import { useTranslation } from "@/lib/i18n"

export default function EvaluationSettingsPage() {
  const { lang } = useTranslation('admin.evaluation')

  return (
    <DisabledFeature 
      title={lang('title')}
      description={lang('description')}
    />
  )
} 
