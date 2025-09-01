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
import { useTimezone, formatGmtLabel } from "@/components/providers/timezone-provider"
import { getPrimaryCityForOffset } from "@/components/ui/timezone-data"
import { Eye, EyeOff, Upload, X, Network, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { useBranding } from "@/components/providers/branding-provider"
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
  SIGNUP_ENABLED: 'auth.signupEnabled',
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
  OAUTH_GITHUB_ENABLED: 'auth.oauth.github.enabled',
  OAUTH_GITHUB_CLIENT_ID: 'auth.oauth.github.clientId',
  OAUTH_GITHUB_CLIENT_SECRET: 'auth.oauth.github.clientSecret',
  API_KEY_ENABLED: 'auth.apiKeyEnabled',
  API_KEY_ENDPOINT_LIMITED: 'auth.apiKeyEndpointLimited',
};

// Zod schema definition
const formSchema = z.object({
  appName: z.string().min(1, "App name is required"),
  signupEnabled: z.boolean(),
  apiKeyEnabled: z.boolean().optional(),
  apiKeyEndpointLimited: z.boolean().optional(),
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
  githubEnabled: z.boolean(),
  githubClientId: z.string().optional(),
  githubClientSecret: z.string().optional(),
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
  const [isSaving, setIsSaving] = useState(false)
  const { gmtOffsetMinutes, setGmtOffsetMinutes } = useTimezone()
  
  // Password visibility state
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({
    ldapAppPassword: false,
    googleClientSecret: false,

    kakaoClientSecret: false,
    naverClientSecret: false,
    githubClientSecret: false,
  })

  // OAuth test state
  const [testingOAuth, setTestingOAuth] = useState<Record<string, boolean>>({
    google: false,

    kakao: false,
    naver: false,
    github: false,
  })
  
  // React Hook Form initialization
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: initialSettings[SETTING_KEYS.APP_NAME] || "kkot-webui",
      signupEnabled: initialSettings[SETTING_KEYS.SIGNUP_ENABLED] === 'true',
      apiKeyEnabled: initialSettings[SETTING_KEYS.API_KEY_ENABLED] === 'true',
      apiKeyEndpointLimited: initialSettings[SETTING_KEYS.API_KEY_ENDPOINT_LIMITED] === 'true',
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
      githubEnabled: initialSettings[SETTING_KEYS.OAUTH_GITHUB_ENABLED] === 'true',
      githubClientId: initialSettings[SETTING_KEYS.OAUTH_GITHUB_CLIENT_ID] || "",
      githubClientSecret: initialSettings[SETTING_KEYS.OAUTH_GITHUB_CLIENT_SECRET] ? "******" : "",
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
        { key: SETTING_KEYS.SIGNUP_ENABLED, value: data.signupEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.API_KEY_ENABLED, value: data.apiKeyEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.API_KEY_ENDPOINT_LIMITED, value: data.apiKeyEndpointLimited ? 'true' : 'false' },
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
        { key: SETTING_KEYS.OAUTH_GITHUB_ENABLED, value: data.githubEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_GITHUB_CLIENT_ID, value: data.githubClientId || '' },
        ...(data.githubClientSecret && !data.githubClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_GITHUB_CLIENT_SECRET, value: data.githubClientSecret }] : []),
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
          // Update branding provider
          updateBranding({
            appName: data.appName
          })

          if (typeof data.gmtOffsetMinutes === 'number') {
            setGmtOffsetMinutes(data.gmtOffsetMinutes)
          }
          
          toast.success(lang('saveSuccessTitle') || 'Settings saved successfully', {
            description: lang('saveSuccessMessage') || 'All settings have been updated.'
          })
          
          // Synchronize server state after saving
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

  // OAuth 테스트 함수
  const testOAuthConnection = async (provider: string) => {
    const formData = form.getValues()
    let clientId = ''
    let clientSecret = ''

    // 제공자별 클라이언트 정보 가져오기
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
      case 'github':
        clientId = formData.githubClientId || ''
        clientSecret = formData.githubClientSecret || ''
        break
    }

    if (!clientId) {
      toast.error('테스트 연결 실패', {
        description: 'Client ID를 입력해주세요.'
      })
      return
    }

    // Client Secret이 마스킹된 경우 서버에서 실제 값을 사용하도록 처리
    const isSecretMasked = clientSecret.startsWith('******')
    
    if (!clientSecret && !isSecretMasked) {
      toast.error('테스트 연결 실패', {
        description: 'Client Secret을 입력해주세요.'
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
          clientSecret: isSecretMasked ? null : clientSecret, // 마스킹된 경우 null 전송
          useStoredSecret: isSecretMasked, // 서버에서 저장된 값 사용 여부
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('연결 테스트 성공', {
          description: result.details || `${provider.toUpperCase()} OAuth 설정이 올바릅니다.`
        })
      } else {
        toast.error('연결 테스트 실패', {
          description: result.details || result.message || '연결에 실패했습니다.'
        })
      }
    } catch (error) {
      toast.error('연결 테스트 실패', {
        description: '서버와의 통신 중 오류가 발생했습니다.'
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

          {/* Branding Settings */}
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
              <FormField
                control={form.control}
                name="signupEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">{lang('basicSystem.enableSignup.label')}</FormLabel>
                      <FormDescription>{lang('basicSystem.enableSignup.description')}</FormDescription>
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
                name="apiKeyEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">{lang('basicSystem.enableApiKey.label')}</FormLabel>
                      <FormDescription>{lang('basicSystem.enableApiKey.description')}</FormDescription>
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
                name="apiKeyEndpointLimited"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">{lang('basicSystem.limitApiKeyEndpoint.label')}</FormLabel>
                      <FormDescription>{lang('basicSystem.limitApiKeyEndpoint.description')}</FormDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>{lang('jwt.title')}</CardTitle>
              <CardDescription>{lang('jwt.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="jwtExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{lang('jwt.expiry.label')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      {lang('jwt.expiry.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{lang('authentication.title')}</CardTitle>
              <CardDescription>{lang('authentication.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="ldapEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-base font-medium">{lang('authentication.ldap.label')}</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("ldapEnabled") && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
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
                  </div>
                )}
              </div>

              <Separator />

              {/* OAuth Authentication Providers */}
              <div className="space-y-6">
                <h4 className="text-base font-semibold">{lang('authentication.oauth.title')}</h4>
                
                {/* Google OAuth */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="googleEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">{lang('authentication.oauth.google.label')}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("googleEnabled") && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200">
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
                                {testingOAuth.google ? '테스트 중...' : '연결 테스트'}
                              </Button>
                            </TooltipTrigger>
                            {form.watch("googleClientSecret")?.startsWith('******') && (
                              <TooltipContent>
                                <p>저장된 Client Secret을 사용하여 테스트합니다</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>



                {/* Kakao OAuth */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="kakaoEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">{lang('authentication.oauth.kakao.label')}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("kakaoEnabled") && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200">
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
                          {testingOAuth.kakao ? '테스트 중...' : '연결 테스트'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Naver OAuth */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="naverEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">{lang('authentication.oauth.naver.label')}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("naverEnabled") && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200">
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
                          {testingOAuth.naver ? '테스트 중...' : '연결 테스트'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* GitHub OAuth */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="githubEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">{lang('authentication.oauth.github.label')}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("githubEnabled") && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="githubClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.github.clientId')}</FormLabel>
                              <FormControl>
                                <Input placeholder={lang('authentication.oauth.github.clientIdPlaceholder')} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="githubClientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.github.clientSecret')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPasswords.githubClientSecret ? "text" : "password"}
                                    placeholder={lang('authentication.oauth.github.clientSecretPlaceholder')}
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, githubClientSecret: !prev.githubClientSecret }))}
                                  >
                                    {showPasswords.githubClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                          disabled={testingOAuth.github}
                          onClick={() => testOAuthConnection('github')}
                        >
                          {testingOAuth.github ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Network className="h-4 w-4 mr-2" />
                          )}
                          {testingOAuth.github ? '테스트 중...' : '연결 테스트'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
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