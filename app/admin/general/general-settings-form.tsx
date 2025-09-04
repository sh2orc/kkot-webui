"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import TimezoneCombobox from "@/components/ui/timezone-combobox"
import JWTExpirySelector from "@/components/ui/jwt-expiry-selector"
import { useTimezone, formatGmtLabel } from "@/components/providers/timezone-provider"
import { getPrimaryCityForOffset } from "@/components/ui/timezone-data"
import { Eye, EyeOff, Upload, X, Network, Loader2, MessageSquare, Plus, Settings, RotateCcw } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { useBranding } from "@/components/providers/branding-provider"
import { useStyle } from "@/components/providers/style-provider"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Setting key constants
const SETTING_KEYS = {
  APP_NAME: 'app.name',
  SIDEBAR_BACKGROUND_COLOR: 'style.sidebarBackgroundColor',
  SIDEBAR_TEXT_COLOR: 'style.sidebarTextColor',
  SIGNUP_ENABLED: 'auth.signupEnabled',
  EMAIL_VERIFICATION_ENABLED: 'auth.emailVerificationEnabled',
  JWT_EXPIRY: 'auth.jwtExpiry',
  LDAP_ENABLED: 'auth.ldapEnabled',
  LDAP_LABEL: 'auth.ldap.label',
  LDAP_HOST: 'auth.ldap.host',
  LDAP_PORT: 'auth.ldap.port',
  LDAP_APP_DN: 'auth.ldap.appDn',
  LDAP_APP_PASSWORD: 'auth.ldap.appPassword',
  LDAP_MAIL_ATTR: 'auth.ldap.mailAttr',
  LDAP_USERNAME_ATTR: 'auth.ldap.usernameAttr',
  LDAP_SEARCH_BASE: 'auth.ldap.searchBase',
  LDAP_SEARCH_FILTER: 'auth.ldap.searchFilter',
  OAUTH_GOOGLE_ENABLED: 'auth.oauth.google.enabled',
  OAUTH_GOOGLE_CLIENT_ID: 'auth.oauth.google.clientId',
  OAUTH_GOOGLE_CLIENT_SECRET: 'auth.oauth.google.clientSecret',

  OAUTH_KAKAO_ENABLED: 'auth.oauth.kakao.enabled',
  OAUTH_KAKAO_CLIENT_ID: 'auth.oauth.kakao.clientId',
  OAUTH_KAKAO_CLIENT_SECRET: 'auth.oauth.kakao.clientSecret',
  OAUTH_NAVER_ENABLED: 'auth.oauth.naver.enabled',
  OAUTH_NAVER_CLIENT_ID: 'auth.oauth.naver.clientId',
  OAUTH_NAVER_CLIENT_SECRET: 'auth.oauth.naver.clientSecret',
};

// Zod schema definition
const formSchema = z.object({
  appName: z.string().min(1, "App name is required"),
  sidebarBackgroundColor: z.string().optional(),
  sidebarTextColor: z.string().optional(),
  signupEnabled: z.boolean(),
  emailVerificationEnabled: z.boolean(),
  jwtExpiry: z.string(),
  ldapEnabled: z.boolean(),
  ldapLabel: z.string().optional(),
  ldapHost: z.string().optional(),
  ldapPort: z.string().optional(),
  ldapAppDn: z.string().optional(),
  ldapAppPassword: z.string().optional(),
  ldapMailAttr: z.string().optional(),
  ldapUsernameAttr: z.string().optional(),
  ldapSearchBase: z.string().optional(),
  ldapSearchFilter: z.string().optional(),
  googleEnabled: z.boolean(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),

  kakaoEnabled: z.boolean(),
  kakaoClientId: z.string().optional(),
  kakaoClientSecret: z.string().optional(),
  naverEnabled: z.boolean(),
  naverClientId: z.string().optional(),
  naverClientSecret: z.string().optional(),
  gmtOffsetMinutes: z.number().optional(),
})

type FormData = z.infer<typeof formSchema>

interface GeneralSettingsFormProps {
  initialSettings: Record<string, string>
}

export default function GeneralSettingsForm({ initialSettings }: GeneralSettingsFormProps) {
  const router = useRouter()
  const { lang } = useTranslation('admin.general')
  const { updateBranding } = useBranding()
  const { updateStyle } = useStyle()
  const [isSaving, setIsSaving] = useState(false)
  const { gmtOffsetMinutes, setGmtOffsetMinutes } = useTimezone()
  
  // Password visibility state
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({
    ldapAppPassword: false,
    googleClientSecret: false,

    kakaoClientSecret: false,
    naverClientSecret: false,
  })

  // OAuth test state
  const [testingOAuth, setTestingOAuth] = useState<Record<string, boolean>>({
    google: false,

    kakao: false,
    naver: false,
  })
  
  // React Hook Form initialization
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: initialSettings[SETTING_KEYS.APP_NAME] || "kkot-webui",
      sidebarBackgroundColor: initialSettings[SETTING_KEYS.SIDEBAR_BACKGROUND_COLOR] || "#f5f5f5",
      sidebarTextColor: initialSettings[SETTING_KEYS.SIDEBAR_TEXT_COLOR] || "#374151",
      signupEnabled: initialSettings[SETTING_KEYS.SIGNUP_ENABLED] === 'true',
      emailVerificationEnabled: initialSettings[SETTING_KEYS.EMAIL_VERIFICATION_ENABLED] === 'true',
      jwtExpiry: initialSettings[SETTING_KEYS.JWT_EXPIRY] || "-1",
      ldapEnabled: initialSettings[SETTING_KEYS.LDAP_ENABLED] === 'true',
      ldapLabel: initialSettings[SETTING_KEYS.LDAP_LABEL] || "LDAP Server",
      ldapHost: initialSettings[SETTING_KEYS.LDAP_HOST] || "localhost",
      ldapPort: initialSettings[SETTING_KEYS.LDAP_PORT] || "389",
      ldapAppDn: initialSettings[SETTING_KEYS.LDAP_APP_DN] || "",
      ldapAppPassword: initialSettings[SETTING_KEYS.LDAP_APP_PASSWORD] ? "******" : "",
      ldapMailAttr: initialSettings[SETTING_KEYS.LDAP_MAIL_ATTR] || "mail",
      ldapUsernameAttr: initialSettings[SETTING_KEYS.LDAP_USERNAME_ATTR] || "uid",
      ldapSearchBase: initialSettings[SETTING_KEYS.LDAP_SEARCH_BASE] || "",
      ldapSearchFilter: initialSettings[SETTING_KEYS.LDAP_SEARCH_FILTER] || "",
      googleEnabled: initialSettings[SETTING_KEYS.OAUTH_GOOGLE_ENABLED] === 'true',
      googleClientId: initialSettings[SETTING_KEYS.OAUTH_GOOGLE_CLIENT_ID] || "",
      googleClientSecret: initialSettings[SETTING_KEYS.OAUTH_GOOGLE_CLIENT_SECRET] ? "******" : "",

      kakaoEnabled: initialSettings[SETTING_KEYS.OAUTH_KAKAO_ENABLED] === 'true',
      kakaoClientId: initialSettings[SETTING_KEYS.OAUTH_KAKAO_CLIENT_ID] || "",
      kakaoClientSecret: initialSettings[SETTING_KEYS.OAUTH_KAKAO_CLIENT_SECRET] ? "******" : "",
      naverEnabled: initialSettings[SETTING_KEYS.OAUTH_NAVER_ENABLED] === 'true',
      naverClientId: initialSettings[SETTING_KEYS.OAUTH_NAVER_CLIENT_ID] || "",
      naverClientSecret: initialSettings[SETTING_KEYS.OAUTH_NAVER_CLIENT_SECRET] ? "******" : "",
      gmtOffsetMinutes: initialSettings['system.gmtOffsetMinutes'] ? parseInt(initialSettings['system.gmtOffsetMinutes'], 10) : gmtOffsetMinutes,
    },
  })

  // Auto-assign GMT from browser if not set in DB
  const [timezoneInitialized, setTimezoneInitialized] = useState(false)
  React.useEffect(() => {
    if (timezoneInitialized) return
    const hasKey = !!initialSettings['system.gmtOffsetMinutes']
    if (!hasKey) {
      const browserOffset = -new Date().getTimezoneOffset()
      form.setValue('gmtOffsetMinutes', browserOffset as any)
      setGmtOffsetMinutes(browserOffset)
      // Save immediately to DB (fire-and-forget)
      fetch('/api/admin-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: [{ key: 'system.gmtOffsetMinutes', value: String(browserOffset) }] })
      }).catch(() => {})
    }
    setTimezoneInitialized(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Form submit handler
  const onSubmit = async (data: FormData) => {
    try {
      setIsSaving(true)
            
      // Prepare settings data to save
      const settings = [
        { key: SETTING_KEYS.APP_NAME, value: data.appName },
        { key: SETTING_KEYS.SIDEBAR_BACKGROUND_COLOR, value: data.sidebarBackgroundColor || '#f5f5f5' },
        { key: SETTING_KEYS.SIDEBAR_TEXT_COLOR, value: data.sidebarTextColor || '#374151' },
        { key: SETTING_KEYS.SIGNUP_ENABLED, value: data.signupEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.EMAIL_VERIFICATION_ENABLED, value: data.emailVerificationEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.JWT_EXPIRY, value: data.jwtExpiry },
        { key: SETTING_KEYS.LDAP_ENABLED, value: data.ldapEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.LDAP_LABEL, value: data.ldapLabel || '' },
        { key: SETTING_KEYS.LDAP_HOST, value: data.ldapHost || '' },
        { key: SETTING_KEYS.LDAP_PORT, value: data.ldapPort || '' },
        { key: SETTING_KEYS.LDAP_APP_DN, value: data.ldapAppDn || '' },
        // Only save password if changed (don't save if masked with asterisks)
        ...(data.ldapAppPassword && !data.ldapAppPassword.startsWith('******') ? [{ key: SETTING_KEYS.LDAP_APP_PASSWORD, value: data.ldapAppPassword }] : []),
        { key: SETTING_KEYS.LDAP_MAIL_ATTR, value: data.ldapMailAttr || '' },
        { key: SETTING_KEYS.LDAP_USERNAME_ATTR, value: data.ldapUsernameAttr || '' },
        { key: SETTING_KEYS.LDAP_SEARCH_BASE, value: data.ldapSearchBase || '' },
        { key: SETTING_KEYS.LDAP_SEARCH_FILTER, value: data.ldapSearchFilter || '' },
        { key: SETTING_KEYS.OAUTH_GOOGLE_ENABLED, value: data.googleEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_GOOGLE_CLIENT_ID, value: data.googleClientId || '' },
        ...(data.googleClientSecret && !data.googleClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_GOOGLE_CLIENT_SECRET, value: data.googleClientSecret }] : []),

        { key: SETTING_KEYS.OAUTH_KAKAO_ENABLED, value: data.kakaoEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_KAKAO_CLIENT_ID, value: data.kakaoClientId || '' },
        ...(data.kakaoClientSecret && !data.kakaoClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_KAKAO_CLIENT_SECRET, value: data.kakaoClientSecret }] : []),
        { key: SETTING_KEYS.OAUTH_NAVER_ENABLED, value: data.naverEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_NAVER_CLIENT_ID, value: data.naverClientId || '' },
        ...(data.naverClientSecret && !data.naverClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_NAVER_CLIENT_SECRET, value: data.naverClientSecret }] : []),
        ...(typeof data.gmtOffsetMinutes === 'number' ? [{ key: 'system.gmtOffsetMinutes', value: String(data.gmtOffsetMinutes) }] : []),
      ]
      
      // Save settings via API
      const response = await fetch('/api/admin-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      })
      
      // Check if response is JSON and handle appropriately
      const contentType = response.headers.get('content-type')
              if (contentType && contentType.includes('application/json')) {
        const result = await response.json()
        
        // Check for error response
        if (result.error) {
          throw new Error(result.error)
        }
        
        // Check for partial failures
        if (result.errors && result.errors.length > 0) {
          console.warn('Some settings failed to save:', result.errors)
          toast.error(lang('savePartialFailureTitle') || 'Some settings failed to save', {
            description: lang('savePartialFailureMessage') || 'Please check the settings and try again.'
          })
        } else {
          // All settings saved successfully
          // Update branding provider immediately for UI feedback
          updateBranding({
            appName: data.appName
          })
          
          // Update style provider
          updateStyle({
            sidebarBackgroundColor: data.sidebarBackgroundColor || '#f5f5f5',
            sidebarTextColor: data.sidebarTextColor || '#374151'
          })

          if (typeof data.gmtOffsetMinutes === 'number') {
            setGmtOffsetMinutes(data.gmtOffsetMinutes)
          }
          
          toast.success(lang('saveSuccessTitle') || 'Settings saved successfully', {
            description: lang('saveSuccessMessage') || 'All settings have been updated.'
          })
          
          // Refresh to sync all components with new DB values
          router.refresh()
        }
      } else {
        // Read as text if not JSON
        const errorText = await response.text()
        console.error('Server error response:', errorText)
        throw new Error(lang('serverError'))
      }
      
    } catch (error) {
      console.error('Settings save error:', error)
      toast.error(lang('saveFailureTitle') || 'Failed to save settings', {
        description: error instanceof Error ? error.message : (lang('saveFailureMessage') || 'An error occurred while saving settings.')
      })
    } finally {
      setIsSaving(false)
    }
  }

  // OAuth test function
  const testOAuthConnection = async (provider: string) => {
    const formData = form.getValues()
    let clientId = ''
    let clientSecret = ''

    // Get client information by provider
    switch (provider) {
      case 'google':
        clientId = formData.googleClientId || ''
        clientSecret = formData.googleClientSecret || ''
        break

      case 'kakao':
        clientId = formData.kakaoClientId || ''
        clientSecret = formData.kakaoClientSecret || ''
        break
      case 'naver':
        clientId = formData.naverClientId || ''
        clientSecret = formData.naverClientSecret || ''
        break
    }

    if (!clientId) {
      toast.error('Test Connection Failed', {
        description: 'Please enter Client ID.'
      })
      return
    }

    // Use actual value from server if Client Secret is masked
    const isSecretMasked = clientSecret.startsWith('******')
    
    if (!clientSecret && !isSecretMasked) {
      toast.error('Test Connection Failed', {
        description: 'Please enter Client Secret.'
      })
      return
    }

    setTestingOAuth(prev => ({ ...prev, [provider]: true }))

    try {
      const response = await fetch('/api/admin/oauth-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          clientId,
          clientSecret: isSecretMasked ? null : clientSecret, // Send null if masked
          useStoredSecret: isSecretMasked, // Whether to use stored value from server
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Connection Test Successful', {
          description: result.details || `${provider.toUpperCase()} OAuth settings are correct.`
        })
      } else {
        toast.error('Connection Test Failed', {
          description: result.details || result.message || 'Connection failed.'
        })
      }
    } catch (error) {
      toast.error('Connection Test Failed', {
        description: 'An error occurred while communicating with the server.'
      })
    } finally {
      setTestingOAuth(prev => ({ ...prev, [provider]: false }))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{lang('title')}</h1>
            <p className="text-gray-600 mt-1">{lang('description')}</p>
          </div>

          {/* Branding & Style Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{lang('branding.title')}</CardTitle>
              <CardDescription>{lang('branding.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Application Name */}
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang('branding.appName.label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={lang('branding.appName.placeholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {lang('branding.appName.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sidebar Text Color */}
              <FormField
                control={form.control}
                name="sidebarTextColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang('style.sidebarTextColor.label') || 'Sidebar Text Color'}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Input
                            type="color"
                            className="w-16 h-10 p-1 cursor-pointer"
                            {...field}
                          />
                        </div>
                        <Input
                          type="text"
                          placeholder="#374151"
                          className="flex-1"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <div 
                          className="w-20 h-10 rounded border border-gray-300 flex items-center justify-center"
                          style={{ backgroundColor: '#f5f5f5' }}
                        >
                          <span 
                            className="text-sm font-medium"
                            style={{ color: field.value || '#374151' }}
                          >
                            ABC
                          </span>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => field.onChange('#374151')}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{lang('style.resetToDefault') || 'Reset to default'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {lang('style.sidebarTextColor.description') || 'Set the text color of the sidebar. Choose a color with good contrast against the background for readability.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sidebar Background Color */}
              <FormField
                control={form.control}
                name="sidebarBackgroundColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang('style.sidebarBackgroundColor.label') || 'Sidebar Background Color'}</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Input
                              type="color"
                              className="w-16 h-10 p-1 cursor-pointer"
                              {...field}
                            />
                          </div>
                          <Input
                            type="text"
                            placeholder="#f5f5f5"
                            className="flex-1"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <div 
                            className="w-20 h-10 rounded border border-gray-300"
                            style={{ backgroundColor: field.value || '#f5f5f5' }}
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10"
                                  onClick={() => field.onChange('#f5f5f5')}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>기본값으로 되돌리기</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {/* Mini sidebar preview */}
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground mb-2">Preview</p>
                          <div className="flex gap-4">
                            {/* Light mode preview */}
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Light Mode</p>
                              <div className="border border-gray-200 rounded-lg overflow-hidden h-40 flex shadow-sm">
                                <div 
                                  className="w-20 border-r border-gray-200 flex flex-col"
                                  style={{ backgroundColor: field.value || '#f5f5f5' }}
                                >
                                  {/* Logo area */}
                                  <div className="h-10 border-b border-gray-200 flex items-center justify-center">
                                    <div className="w-12 h-4 rounded" style={{ backgroundColor: form.watch('sidebarTextColor') || '#374151' }} />
                                  </div>
                                  
                                  {/* New chat button */}
                                  <div className="p-2">
                                    <div className="h-7 bg-white/80 border border-gray-300 rounded-md flex items-center justify-center">
                                      <Plus className="h-3 w-3" style={{ color: form.watch('sidebarTextColor') || '#374151' }} />
                                    </div>
                                  </div>
                                  
                                  {/* Chat list */}
                                  <div className="flex-1 px-2 space-y-1">
                                    <div className="h-6 bg-gray-300/50 rounded flex items-center px-1">
                                      <MessageSquare className="h-2 w-2 mr-1" style={{ color: form.watch('sidebarTextColor') || '#374151' }} />
                                      <div className="flex-1 h-1 rounded" style={{ backgroundColor: form.watch('sidebarTextColor') || '#374151', opacity: 0.8 }} />
                                    </div>
                                    <div className="h-6 bg-gray-300/30 rounded flex items-center px-1">
                                      <MessageSquare className="h-2 w-2 mr-1" style={{ color: form.watch('sidebarTextColor') || '#374151', opacity: 0.6 }} />
                                      <div className="flex-1 h-1 rounded" style={{ backgroundColor: form.watch('sidebarTextColor') || '#374151', opacity: 0.4 }} />
                                    </div>
                                  </div>
                                  
                                  {/* Settings area */}
                                  <div className="p-2 border-t border-gray-200">
                                    <div className="h-6 flex items-center justify-center">
                                      <Settings className="h-3 w-3" style={{ color: form.watch('sidebarTextColor') || '#374151' }} />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 bg-white p-3">
                                  <div className="h-2 bg-gray-200 rounded w-3/4 mb-2" />
                                  <div className="h-2 bg-gray-200 rounded w-full mb-2" />
                                  <div className="h-2 bg-gray-200 rounded w-5/6" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Dark mode preview */}
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Dark Mode</p>
                              <div className="border border-gray-700 rounded-lg overflow-hidden h-40 flex shadow-sm">
                                <div 
                                  className="w-20 bg-gray-900 border-r border-gray-700 flex flex-col"
                                >
                                  {/* Logo area */}
                                  <div className="h-10 border-b border-gray-700 flex items-center justify-center">
                                    <div className="w-12 h-4 bg-gray-600 rounded" />
                                  </div>
                                  
                                  {/* New chat button */}
                                  <div className="p-2">
                                    <div className="h-7 bg-gray-800 border border-gray-700 rounded-md flex items-center justify-center">
                                      <Plus className="h-3 w-3 text-gray-400" />
                                    </div>
                                  </div>
                                  
                                  {/* Chat list */}
                                  <div className="flex-1 px-2 space-y-1">
                                    <div className="h-6 bg-gray-800 rounded flex items-center px-1">
                                      <MessageSquare className="h-2 w-2 text-gray-400 mr-1" />
                                      <div className="flex-1 h-1 bg-gray-600 rounded" />
                                    </div>
                                    <div className="h-6 bg-gray-800/50 rounded flex items-center px-1">
                                      <MessageSquare className="h-2 w-2 text-gray-500 mr-1" />
                                      <div className="flex-1 h-1 bg-gray-700 rounded" />
                                    </div>
                                  </div>
                                  
                                  {/* Settings area */}
                                  <div className="p-2 border-t border-gray-700">
                                    <div className="h-6 flex items-center justify-center">
                                      <Settings className="h-3 w-3 text-gray-400" />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 bg-gray-800 p-3">
                                  <div className="h-2 bg-gray-700 rounded w-3/4 mb-2" />
                                  <div className="h-2 bg-gray-700 rounded w-full mb-2" />
                                  <div className="h-2 bg-gray-700 rounded w-5/6" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {lang('style.sidebarBackgroundColor.description') || 'Set the background color of the sidebar. The default dark theme is applied in dark mode.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{lang('basicSystem.title')}</CardTitle>
              <CardDescription>{lang('basicSystem.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timezone (GMT) */}
              <FormField
                control={form.control}
                name="gmtOffsetMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang('basicSystem.timezone.label')}</FormLabel>
                    <FormControl>
                      <TimezoneCombobox
                        value={field.value ?? null}
                        onChange={(val) => field.onChange(val)}
                        placeholder={`${formatGmtLabel(gmtOffsetMinutes)}${getPrimaryCityForOffset(gmtOffsetMinutes) ? ` (${getPrimaryCityForOffset(gmtOffsetMinutes)!.toUpperCase()})` : ''}`}
                      />
                    </FormControl>
                    <FormDescription>
                      {lang('basicSystem.timezone.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>



          {/* Basic Authentication Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{lang('authentication.basic.title')}</CardTitle>
              <CardDescription>{lang('authentication.basic.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="signupEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">{lang('authentication.enableSignup.label')}</FormLabel>
                      <FormDescription>{lang('authentication.enableSignup.description')}</FormDescription>
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

              <FormField
                control={form.control}
                name="emailVerificationEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">{lang('authentication.emailVerification.label')}</FormLabel>
                      <FormDescription>{lang('authentication.emailVerification.description')}</FormDescription>
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

              <FormField
                control={form.control}
                name="jwtExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang('authentication.jwt.expiry.label')}</FormLabel>
                    <FormControl>
                      <JWTExpirySelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {lang('authentication.jwt.expiry.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* LDAP Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{lang('authentication.ldap.title')}</div>
                  <div className="text-sm text-muted-foreground mt-1">{lang('authentication.ldap.description')}</div>
                </div>

                <FormField
                  control={form.control}
                  name="ldapEnabled"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </CardTitle>
            </CardHeader>
            
            {form.watch("ldapEnabled") && (
              <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ldapLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{lang('authentication.ldap.labelField')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ldapHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{lang('authentication.ldap.host')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ldapPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{lang('authentication.ldap.port')}</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ldapAppDn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{lang('authentication.ldap.applicationDn')}</FormLabel>
                            <FormControl>
                              <Input placeholder={lang('authentication.ldap.applicationDnPlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ldapAppPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{lang('authentication.ldap.applicationDnPassword')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPasswords.ldapAppPassword ? "text" : "password"}
                                  placeholder={lang('authentication.ldap.applicationDnPasswordPlaceholder')}
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                  onClick={() => setShowPasswords(prev => ({ ...prev, ldapAppPassword: !prev.ldapAppPassword }))}
                                >
                                  {showPasswords.ldapAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="ldapMailAttr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{lang('authentication.ldap.mailAttribute')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ldapUsernameAttr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{lang('authentication.ldap.usernameAttribute')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ldapSearchBase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{lang('authentication.ldap.searchBase')}</FormLabel>
                          <FormControl>
                            <Input placeholder={lang('authentication.ldap.searchBasePlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ldapSearchFilter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{lang('authentication.ldap.searchFilter')}</FormLabel>
                          <FormControl>
                            <Input placeholder={lang('authentication.ldap.searchFilterPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </CardContent>
            )}
          </Card>

          {/* OAuth Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>{lang('authentication.oauth.title')}</CardTitle>
              <CardDescription>{lang('authentication.oauth.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Google OAuth */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">G</span>
                        </div>
                        <span>{lang('authentication.oauth.google.label')}</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="googleEnabled"
                        render={({ field }) => (
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        )}
                      />
                    </CardTitle>
                  </CardHeader>

                  {form.watch("googleEnabled") && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="googleClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.google.clientId')}</FormLabel>
                              <FormControl>
                                <Input placeholder={lang('authentication.oauth.google.clientIdPlaceholder')} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="googleClientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.google.clientSecret')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPasswords.googleClientSecret ? "text" : "password"}
                                    placeholder={lang('authentication.oauth.google.clientSecretPlaceholder')}
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, googleClientSecret: !prev.googleClientSecret }))}
                                  >
                                    {showPasswords.googleClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={testingOAuth.google}
                                onClick={() => testOAuthConnection('google')}
                              >
                                {testingOAuth.google ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Network className="h-4 w-4 mr-2" />
                                )}
                                {testingOAuth.google ? 'Testing...' : 'Test Connection'}
                              </Button>
                            </TooltipTrigger>
                            {form.watch("googleClientSecret")?.startsWith('******') && (
                              <TooltipContent>
                                <p>Test using saved Client Secret</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  )}
                </Card>



                {/* Kakao OAuth */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-black">K</span>
                        </div>
                        <span>{lang('authentication.oauth.kakao.label')}</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="kakaoEnabled"
                        render={({ field }) => (
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        )}
                      />
                    </CardTitle>
                  </CardHeader>

                  {form.watch("kakaoEnabled") && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="kakaoClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.kakao.clientId')}</FormLabel>
                              <FormControl>
                                <Input placeholder={lang('authentication.oauth.kakao.clientIdPlaceholder')} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="kakaoClientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.kakao.clientSecret')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPasswords.kakaoClientSecret ? "text" : "password"}
                                    placeholder={lang('authentication.oauth.kakao.clientSecretPlaceholder')}
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, kakaoClientSecret: !prev.kakaoClientSecret }))}
                                  >
                                    {showPasswords.kakaoClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={testingOAuth.kakao}
                          onClick={() => testOAuthConnection('kakao')}
                        >
                          {testingOAuth.kakao ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Network className="h-4 w-4 mr-2" />
                          )}
                          {testingOAuth.kakao ? 'Testing...' : 'Test Connection'}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Naver OAuth */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">N</span>
                        </div>
                        <span>{lang('authentication.oauth.naver.label')}</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="naverEnabled"
                        render={({ field }) => (
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        )}
                      />
                    </CardTitle>
                  </CardHeader>

                  {form.watch("naverEnabled") && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="naverClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.naver.clientId')}</FormLabel>
                              <FormControl>
                                <Input placeholder={lang('authentication.oauth.naver.clientIdPlaceholder')} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="naverClientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.naver.clientSecret')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPasswords.naverClientSecret ? "text" : "password"}
                                    placeholder={lang('authentication.oauth.naver.clientSecretPlaceholder')}
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, naverClientSecret: !prev.naverClientSecret }))}
                                  >
                                    {showPasswords.naverClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={testingOAuth.naver}
                          onClick={() => testOAuthConnection('naver')}
                        >
                          {testingOAuth.naver ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Network className="h-4 w-4 mr-2" />
                          )}
                          {testingOAuth.naver ? 'Testing...' : 'Test Connection'}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? `${lang('savingButton')}...` : lang('saveButton')}
            </Button>
          </div>
      </form>
    </Form>
  )
} 