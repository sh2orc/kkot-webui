"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Upload, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
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
  API_KEY_ENABLED: 'auth.apiKeyEnabled',
  API_KEY_ENDPOINT_LIMITED: 'auth.apiKeyEndpointLimited',
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
  OAUTH_MICROSOFT_ENABLED: 'auth.oauth.microsoft.enabled',
  OAUTH_MICROSOFT_CLIENT_ID: 'auth.oauth.microsoft.clientId',
  OAUTH_MICROSOFT_CLIENT_SECRET: 'auth.oauth.microsoft.clientSecret',
  OAUTH_KAKAO_ENABLED: 'auth.oauth.kakao.enabled',
  OAUTH_KAKAO_CLIENT_ID: 'auth.oauth.kakao.clientId',
  OAUTH_KAKAO_CLIENT_SECRET: 'auth.oauth.kakao.clientSecret',
  OAUTH_NAVER_ENABLED: 'auth.oauth.naver.enabled',
  OAUTH_NAVER_CLIENT_ID: 'auth.oauth.naver.clientId',
  OAUTH_NAVER_CLIENT_SECRET: 'auth.oauth.naver.clientSecret',
  OAUTH_GITHUB_ENABLED: 'auth.oauth.github.enabled',
  OAUTH_GITHUB_CLIENT_ID: 'auth.oauth.github.clientId',
  OAUTH_GITHUB_CLIENT_SECRET: 'auth.oauth.github.clientSecret',
};

// Zod schema definition
const formSchema = z.object({
  appName: z.string().min(1, "App name is required"),
  signupEnabled: z.boolean(),
  apiKeyEnabled: z.boolean(),
  apiKeyEndpointLimited: z.boolean(),
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
  microsoftEnabled: z.boolean(),
  microsoftClientId: z.string().optional(),
  microsoftClientSecret: z.string().optional(),
  kakaoEnabled: z.boolean(),
  kakaoClientId: z.string().optional(),
  kakaoClientSecret: z.string().optional(),
  naverEnabled: z.boolean(),
  naverClientId: z.string().optional(),
  naverClientSecret: z.string().optional(),
  githubEnabled: z.boolean(),
  githubClientId: z.string().optional(),
  githubClientSecret: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface GeneralSettingsFormProps {
  initialSettings: Record<string, string>
}

export default function GeneralSettingsForm({ initialSettings }: GeneralSettingsFormProps) {
  const { lang } = useTranslation('admin.general')
  const { toast } = useToast()
  const { updateBranding } = useBranding()
  const [isSaving, setIsSaving] = useState(false)
  
  // Password visibility state
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({
    ldapAppPassword: false,
    googleClientSecret: false,
    microsoftClientSecret: false,
    kakaoClientSecret: false,
    naverClientSecret: false,
    githubClientSecret: false,
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
      microsoftEnabled: initialSettings[SETTING_KEYS.OAUTH_MICROSOFT_ENABLED] === 'true',
      microsoftClientId: initialSettings[SETTING_KEYS.OAUTH_MICROSOFT_CLIENT_ID] || "",
      microsoftClientSecret: initialSettings[SETTING_KEYS.OAUTH_MICROSOFT_CLIENT_SECRET] ? "******" : "",
      kakaoEnabled: initialSettings[SETTING_KEYS.OAUTH_KAKAO_ENABLED] === 'true',
      kakaoClientId: initialSettings[SETTING_KEYS.OAUTH_KAKAO_CLIENT_ID] || "",
      kakaoClientSecret: initialSettings[SETTING_KEYS.OAUTH_KAKAO_CLIENT_SECRET] ? "******" : "",
      naverEnabled: initialSettings[SETTING_KEYS.OAUTH_NAVER_ENABLED] === 'true',
      naverClientId: initialSettings[SETTING_KEYS.OAUTH_NAVER_CLIENT_ID] || "",
      naverClientSecret: initialSettings[SETTING_KEYS.OAUTH_NAVER_CLIENT_SECRET] ? "******" : "",
      githubEnabled: initialSettings[SETTING_KEYS.OAUTH_GITHUB_ENABLED] === 'true',
      githubClientId: initialSettings[SETTING_KEYS.OAUTH_GITHUB_CLIENT_ID] || "",
      githubClientSecret: initialSettings[SETTING_KEYS.OAUTH_GITHUB_CLIENT_SECRET] ? "******" : "",
    },
  })
  
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
        { key: SETTING_KEYS.OAUTH_MICROSOFT_ENABLED, value: data.microsoftEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_MICROSOFT_CLIENT_ID, value: data.microsoftClientId || '' },
        ...(data.microsoftClientSecret && !data.microsoftClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_MICROSOFT_CLIENT_SECRET, value: data.microsoftClientSecret }] : []),
        { key: SETTING_KEYS.OAUTH_KAKAO_ENABLED, value: data.kakaoEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_KAKAO_CLIENT_ID, value: data.kakaoClientId || '' },
        ...(data.kakaoClientSecret && !data.kakaoClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_KAKAO_CLIENT_SECRET, value: data.kakaoClientSecret }] : []),
        { key: SETTING_KEYS.OAUTH_NAVER_ENABLED, value: data.naverEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_NAVER_CLIENT_ID, value: data.naverClientId || '' },
        ...(data.naverClientSecret && !data.naverClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_NAVER_CLIENT_SECRET, value: data.naverClientSecret }] : []),
        { key: SETTING_KEYS.OAUTH_GITHUB_ENABLED, value: data.githubEnabled ? 'true' : 'false' },
        { key: SETTING_KEYS.OAUTH_GITHUB_CLIENT_ID, value: data.githubClientId || '' },
        ...(data.githubClientSecret && !data.githubClientSecret.startsWith('******') ? [{ key: SETTING_KEYS.OAUTH_GITHUB_CLIENT_SECRET, value: data.githubClientSecret }] : []),
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
          toast({
            title: lang('savePartialFailureTitle'),
            description: lang('savePartialFailureMessage'),
            variant: "destructive"
          })
        } else {
          // All settings saved successfully
          // Update branding provider
          updateBranding({
            appName: data.appName
          })
          
          toast({
            title: lang('saveSuccessTitle'),
            description: lang('saveSuccessMessage'),
          })
        }
      } else {
        // Read as text if not JSON
        const errorText = await response.text()
        console.error('Server error response:', errorText)
        throw new Error(lang('serverError'))
      }
      
    } catch (error) {
      console.error('Settings save error:', error)
      toast({
        title: lang('saveFailureTitle'),
        description: error instanceof Error ? error.message : lang('saveFailureMessage'),
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <AdminLayout>
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
                    </div>
                  )}
                </div>

                {/* Microsoft OAuth */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="microsoftEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">{lang('authentication.oauth.microsoft.label')}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("microsoftEnabled") && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="microsoftClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.microsoft.clientId')}</FormLabel>
                              <FormControl>
                                <Input placeholder={lang('authentication.oauth.microsoft.clientIdPlaceholder')} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="microsoftClientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{lang('authentication.oauth.microsoft.clientSecret')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPasswords.microsoftClientSecret ? "text" : "password"}
                                    placeholder={lang('authentication.oauth.microsoft.clientSecretPlaceholder')}
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, microsoftClientSecret: !prev.microsoftClientSecret }))}
                                  >
                                    {showPasswords.microsoftClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                    </div>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit"
              className="bg-black text-white hover:text-white hover:bg-blue-800"
              disabled={isSaving}
            >
              {isSaving ? `${lang('savingButton')}...` : lang('saveButton')}
            </Button>
          </div>
        </form>
      </Form>
    </AdminLayout>
  )
} 