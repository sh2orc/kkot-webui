"use client"

import AdminLayout from "@/components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

export default function EvaluationSettingsPage() {
  const { lang } = useTranslation('admin.evaluation')

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
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{lang('autoEvaluation.label')}</Label>
                <p className="text-sm text-gray-500">{lang('autoEvaluation.description')}</p>
              </div>
              <Switch />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eval-interval">{lang('evaluationInterval.label')}</Label>
              <Input id="eval-interval" type="number" defaultValue="24" />
              <p className="text-xs text-gray-500">{lang('evaluationInterval.description')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-black text-white hover:bg-blue-700 hover:text-white">{lang('saveButton')}</Button>
        </div>
      </div>
    </AdminLayout>
  )
} 
