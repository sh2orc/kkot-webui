"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Plus, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Zod schema for API management settings
const apiManagementSchema = z.object({
  apiEnabled: z.boolean(),
  openaiCompatible: z.boolean(),
  corsEnabled: z.boolean(),
  corsOrigins: z.array(z.string().min(1, "Please enter a domain.")),
  rateLimitEnabled: z.boolean(),
  rateLimitRequests: z.number().min(1, "At least 1 request is required."),
  rateLimitWindow: z.number().min(60, "Must be at least 60 seconds."),
  requireAuth: z.boolean(),
})

type ApiManagementFormData = z.infer<typeof apiManagementSchema>

interface ApiManagementFormProps {
  initialSettings?: Partial<ApiManagementFormData>
}

export default function ApiManagementForm({ initialSettings }: ApiManagementFormProps) {
  const { toast } = useToast()
  const { t, lang } = useTranslation('admin.api')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const form = useForm<ApiManagementFormData>({
    resolver: zodResolver(apiManagementSchema),
    defaultValues: {
      apiEnabled: initialSettings?.apiEnabled ?? false,
      openaiCompatible: initialSettings?.openaiCompatible ?? true,
      corsEnabled: initialSettings?.corsEnabled ?? true,
      corsOrigins: initialSettings?.corsOrigins ?? ["*"],
      rateLimitEnabled: initialSettings?.rateLimitEnabled ?? true,
      rateLimitRequests: initialSettings?.rateLimitRequests ?? 1000,
      rateLimitWindow: initialSettings?.rateLimitWindow ?? 3600,
      requireAuth: initialSettings?.requireAuth ?? true,
    },
  })

  // Load saved settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/api-management')
        if (response.ok) {
          const settings = await response.json()
          form.reset({
            apiEnabled: settings.apiEnabled,
            openaiCompatible: settings.openaiCompatible,
            corsEnabled: settings.corsEnabled,
            corsOrigins: Array.isArray(settings.corsOrigins) 
              ? settings.corsOrigins 
              : settings.corsOrigins ? settings.corsOrigins.split(',').map((s: string) => s.trim()) : ["*"],
            rateLimitEnabled: settings.rateLimitEnabled,
            rateLimitRequests: settings.rateLimitRequests,
            rateLimitWindow: settings.rateLimitWindow,
            requireAuth: settings.requireAuth,
          })
        }
      } catch (error) {
        console.error('Failed to fetch API settings:', error)
        toast({
          title: "Failed to load settings",
          description: "Failed to load saved settings. Using default values.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [form, toast])

  const onSubmit = async (data: ApiManagementFormData) => {
    try {
      setIsSaving(true)
      
      // Convert corsOrigins array to string
      const submitData = {
        ...data,
        corsOrigins: data.corsOrigins.filter(origin => origin.trim() !== '').join(', ')
      }
      
      const response = await fetch('/api/api-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: API 설정 저장에 실패했습니다.`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      toast({
        title: await t('messages.saveSuccess'),
        description: result.message || await t('messages.saveSuccess'),
      })
    } catch (error) {
      console.error('API Management save error:', error)
      toast({
        title: await t('messages.saveError'),
        description: error instanceof Error ? error.message : await t('messages.saveError'),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* API Service Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{lang('apiService.title')}</CardTitle>
            <CardDescription>
              {lang('apiService.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="apiEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base font-medium">{lang('apiService.enabled.label')}</FormLabel>
                    <FormDescription>
                      {lang('apiService.enabled.description')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="openaiCompatible"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base font-medium">{lang('apiService.openaiCompatible.label')}</FormLabel>
                    <FormDescription>
                      {lang('apiService.openaiCompatible.description')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* CORS Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{lang('apiService.corsSettings.title')}</CardTitle>
            <CardDescription>
              {lang('apiService.corsSettings.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="corsEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base font-medium">{lang('apiService.corsSettings.enabled.label')}</FormLabel>
                    <FormDescription>
                      {lang('apiService.corsSettings.enabled.description')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("corsEnabled") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{lang('apiService.corsSettings.origins.label')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentOrigins = form.getValues("corsOrigins")
                      form.setValue("corsOrigins", [...currentOrigins, ""])
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {lang('apiService.corsSettings.origins.addButton')}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {form.watch("corsOrigins").map((origin, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        placeholder={index === 0 ? lang('apiService.corsSettings.origins.placeholder') : "https://example.com"}
                        value={origin}
                        onChange={(e) => {
                          const newOrigins = [...form.getValues("corsOrigins")]
                          newOrigins[index] = e.target.value
                          form.setValue("corsOrigins", newOrigins)
                        }}
                        className="flex-1"
                      />
                      {form.watch("corsOrigins").length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newOrigins = form.getValues("corsOrigins").filter((_, i) => i !== index)
                            form.setValue("corsOrigins", newOrigins)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {lang('apiService.corsSettings.origins.description')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rate Limiting Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{lang('apiService.rateLimiting.title')}</CardTitle>
            <CardDescription>
              {lang('apiService.rateLimiting.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="rateLimitEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base font-medium">{lang('apiService.rateLimiting.enabled.label')}</FormLabel>
                    <FormDescription>
                      {lang('apiService.rateLimiting.enabled.description')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("rateLimitEnabled") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rateLimitRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{lang('apiService.rateLimiting.requests.label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {lang('apiService.rateLimiting.requests.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rateLimitWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{lang('apiService.rateLimiting.window.label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="60"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {lang('apiService.rateLimiting.window.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Authentication Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{lang('apiService.authentication.title')}</CardTitle>
            <CardDescription>
              {lang('apiService.authentication.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="requireAuth"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base font-medium">{lang('apiService.authentication.requireAuth.label')}</FormLabel>
                    <FormDescription>
                      {lang('apiService.authentication.requireAuth.description')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? lang('messages.saving') : lang('messages.save')}
          </Button>
        </div>
      </form>
    </Form>
  )
} 