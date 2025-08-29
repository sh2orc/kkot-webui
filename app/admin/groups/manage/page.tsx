"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

interface Group {
  id: string
  name: string
  description?: string
  isSystem: boolean
  isActive: boolean
}

export default function GroupManagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang, language } = useTranslation('admin.groups')
  
  const groupId = searchParams.get('id')
  const isCreating = !groupId
  
  const [group, setGroup] = useState<Group | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.groups')
  }, [language])

  useEffect(() => {
    if (groupId) {
      fetchGroup()
    }
  }, [groupId])

  const fetchGroup = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (!response.ok) throw new Error("Failed to fetch group")
      const data = await response.json()
      setGroup(data)
      setName(data.name)
      setDescription(data.description || "")
      setIsActive(data.isActive)
    } catch (error) {
      toast.error(lang('errors.fetchFailed'))
      router.push('/admin/groups')
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!name.trim()) {
      newErrors.name = lang('errors.nameRequired')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const url = isCreating ? "/api/groups" : `/api/groups/${groupId}`
      const method = isCreating ? "POST" : "PUT"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          isActive
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save group")
      }
      
      toast.success(isCreating ? lang('createSuccess') : lang('updateSuccess'))
      router.push('/admin/groups')
    } catch (error: any) {
      toast.error(error.message || lang('errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/groups')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-9 w-64" />
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="grid gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-20 w-full" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>

              <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/groups')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isCreating ? lang('dialog.createTitle') : lang('dialog.editTitle')}
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {isCreating ? lang('dialog.createDescription') : lang('dialog.editDescription')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">{lang('fields.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang('fields.namePlaceholder')}
                disabled={group?.isSystem}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">{lang('fields.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang('fields.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{lang('fields.isActive')}</Label>
                <p className="text-sm text-muted-foreground">
                  {lang('fields.isActiveDescription')}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={group?.isSystem}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/groups')}
              >
                {lang('dialog.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                    {lang('saving')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isCreating ? lang('dialog.create') : lang('dialog.save')}
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
