"use client"

import AdminLayout from "@/components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

export default function ModelSettingsPage() {
  const { lang } = useTranslation('admin.model')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">{lang('description')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{lang('modelManagement.title')}</CardTitle>
            <CardDescription>{lang('modelManagement.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-model">{lang('modelManagement.defaultModel')}</Label>
              <Select defaultValue="gemma3">
                <SelectTrigger>
                  <SelectValue placeholder={lang('modelManagement.selectModel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemma3">gemma3:27b-it-qat</SelectItem>
                  <SelectItem value="gpt4o">gpt-4o</SelectItem>
                  <SelectItem value="claude">claude-3-sonnet</SelectItem>
                  <SelectItem value="llama">llama-3.1-70b</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">{lang('modelManagement.maxTokens')}</Label>
              <Input id="max-tokens" type="number" defaultValue="4096" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">{lang('modelManagement.temperature')}</Label>
              <Input id="temperature" type="number" step="0.1" min="0" max="2" defaultValue="0.7" />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-black text-white hover:bg-gray-800">{lang('saveButton')}</Button>
        </div>
      </div>
    </AdminLayout>
  )
} 
