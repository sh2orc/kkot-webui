"use client"

import { useState } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Upload, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function GeneralSettingsPage() {
  const { lang } = useTranslation('admin.general')
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // 브랜딩 설정 상태 관리
  const [appName, setAppName] = useState("kkot-webui")
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string>("")
  const [logoPreview, setLogoPreview] = useState<string>("")
  
  // OAuth 제공자 활성화 상태 관리
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false)
  const [kakaoEnabled, setKakaoEnabled] = useState(false)
  const [naverEnabled, setNaverEnabled] = useState(false)
  const [githubEnabled, setGithubEnabled] = useState(false)
  
  // LDAP 활성화 상태 관리
  const [ldapEnabled, setLdapEnabled] = useState(false)

  // 파일 업로드 핸들러
  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFaviconFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setFaviconPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFavicon = () => {
    setFaviconFile(null)
    setFaviconPreview("")
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview("")
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">{lang('description')}</p>
        </div>

        {/* 브랜딩 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>{lang('branding.title')}</CardTitle>
            <CardDescription>{lang('branding.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 애플리케이션 이름 */}
            <div className="space-y-2">
              <Label htmlFor="app-name">{lang('branding.appName.label')}</Label>
              <Input 
                id="app-name" 
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={lang('branding.appName.placeholder')}
              />
              <p className="text-xs text-gray-500">
                {lang('branding.appName.description')}
              </p>
            </div>

            <Separator />

            {/* 파비콘 업로드 */}
            <div className="space-y-2">
              <Label>{lang('branding.favicon.label')}</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="favicon-upload"
                    accept=".png,.ico,.jpg,.jpeg"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('favicon-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {lang('branding.favicon.button')}
                  </Button>
                  {faviconFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFavicon}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                      {lang('branding.favicon.remove')}
                    </Button>
                  )}
                </div>
                {faviconPreview && (
                  <div className="flex items-center gap-2">
                    <img src={faviconPreview} alt="Favicon preview" className="w-8 h-8 rounded" />
                    <span className="text-sm text-gray-500">{faviconFile?.name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {lang('branding.favicon.description')}
              </p>
            </div>

            <Separator />

            {/* 로고 업로드 */}
            <div className="space-y-2">
              <Label>{lang('branding.logo.label')}</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="logo-upload"
                    accept=".png,.svg,.jpg,.jpeg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {lang('branding.logo.button')}
                  </Button>
                  {logoFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeLogo}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                      {lang('branding.logo.remove')}
                    </Button>
                  )}
                </div>
                {logoPreview && (
                  <div className="flex items-center gap-2">
                    <img src={logoPreview} alt="Logo preview" className="w-12 h-12 rounded object-contain bg-gray-100" />
                    <span className="text-sm text-gray-500">{logoFile?.name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {lang('branding.logo.description')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lang('basicSystem.title')}</CardTitle>
            <CardDescription>{lang('basicSystem.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{lang('basicSystem.enableSignup.label')}</Label>
                <p className="text-sm text-gray-500">{lang('basicSystem.enableSignup.description')}</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{lang('basicSystem.enableApiKey.label')}</Label>
                <p className="text-sm text-gray-500">{lang('basicSystem.enableApiKey.description')}</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{lang('basicSystem.limitApiKeyEndpoint.label')}</Label>
                <p className="text-sm text-gray-500">{lang('basicSystem.limitApiKeyEndpoint.description')}</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lang('jwt.title')}</CardTitle>
            <CardDescription>{lang('jwt.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jwt-expiry">{lang('jwt.expiry.label')}</Label>
              <Input id="jwt-expiry" type="number" defaultValue="-1" />
              <p className="text-xs text-gray-500">
                {lang('jwt.expiry.description')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lang('authentication.title')}</CardTitle>
            <CardDescription>{lang('authentication.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{lang('authentication.ldap.label')}</Label>
                <Switch checked={ldapEnabled} onCheckedChange={setLdapEnabled} />
              </div>

              {ldapEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <div className="space-y-2">
                    <Label htmlFor="ldap-label">{lang('authentication.ldap.labelField')}</Label>
                    <Input id="ldap-label" defaultValue="LDAP Server" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ldap-host">{lang('authentication.ldap.host')}</Label>
                      <Input id="ldap-host" defaultValue="localhost" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ldap-port">{lang('authentication.ldap.port')}</Label>
                      <Input id="ldap-port" type="number" defaultValue="389" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-dn">{lang('authentication.ldap.applicationDn')}</Label>
                      <Input id="app-dn" placeholder={lang('authentication.ldap.applicationDnPlaceholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app-dn-password">{lang('authentication.ldap.applicationDnPassword')}</Label>
                      <div className="relative">
                        <Input
                          id="app-dn-password"
                          type={showAppPassword ? "text" : "password"}
                          placeholder={lang('authentication.ldap.applicationDnPasswordPlaceholder')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowAppPassword(!showAppPassword)}
                        >
                          {showAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mail-attr">{lang('authentication.ldap.mailAttribute')}</Label>
                    <Input id="mail-attr" defaultValue="mail" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username-attr">{lang('authentication.ldap.usernameAttribute')}</Label>
                    <Input id="username-attr" defaultValue="uid" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search-base">{lang('authentication.ldap.searchBase')}</Label>
                    <Input id="search-base" placeholder={lang('authentication.ldap.searchBasePlaceholder')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search-filter">{lang('authentication.ldap.searchFilter')}</Label>
                    <Input id="search-filter" placeholder={lang('authentication.ldap.searchFilterPlaceholder')} />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* OAuth Authentication Providers */}
            <div className="space-y-6">
              <h4 className="text-base font-semibold">{lang('authentication.oauth.title')}</h4>
              
              {/* Google OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{lang('authentication.oauth.google.label')}</Label>
                  <Switch checked={googleEnabled} onCheckedChange={setGoogleEnabled} />
                </div>

                {googleEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="google-client-id">{lang('authentication.oauth.google.clientId')}</Label>
                        <Input id="google-client-id" placeholder={lang('authentication.oauth.google.clientIdPlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="google-client-secret">{lang('authentication.oauth.google.clientSecret')}</Label>
                        <div className="relative">
                          <Input
                            id="google-client-secret"
                            type={showPassword ? "text" : "password"}
                            placeholder={lang('authentication.oauth.google.clientSecretPlaceholder')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Microsoft OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{lang('authentication.oauth.microsoft.label')}</Label>
                  <Switch checked={microsoftEnabled} onCheckedChange={setMicrosoftEnabled} />
                </div>

                {microsoftEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="microsoft-client-id">{lang('authentication.oauth.microsoft.clientId')}</Label>
                        <Input id="microsoft-client-id" placeholder={lang('authentication.oauth.microsoft.clientIdPlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="microsoft-client-secret">{lang('authentication.oauth.microsoft.clientSecret')}</Label>
                        <Input id="microsoft-client-secret" type="password" placeholder={lang('authentication.oauth.microsoft.clientSecretPlaceholder')} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Kakao OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{lang('authentication.oauth.kakao.label')}</Label>
                  <Switch checked={kakaoEnabled} onCheckedChange={setKakaoEnabled} />
                </div>

                {kakaoEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="kakao-client-id">{lang('authentication.oauth.kakao.clientId')}</Label>
                        <Input id="kakao-client-id" placeholder={lang('authentication.oauth.kakao.clientIdPlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kakao-client-secret">{lang('authentication.oauth.kakao.clientSecret')}</Label>
                        <Input id="kakao-client-secret" type="password" placeholder={lang('authentication.oauth.kakao.clientSecretPlaceholder')} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Naver OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{lang('authentication.oauth.naver.label')}</Label>
                  <Switch checked={naverEnabled} onCheckedChange={setNaverEnabled} />
                </div>

                {naverEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="naver-client-id">{lang('authentication.oauth.naver.clientId')}</Label>
                        <Input id="naver-client-id" placeholder={lang('authentication.oauth.naver.clientIdPlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="naver-client-secret">{lang('authentication.oauth.naver.clientSecret')}</Label>
                        <Input id="naver-client-secret" type="password" placeholder={lang('authentication.oauth.naver.clientSecretPlaceholder')} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GitHub OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{lang('authentication.oauth.github.label')}</Label>
                  <Switch checked={githubEnabled} onCheckedChange={setGithubEnabled} />
                </div>

                {githubEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="github-client-id">{lang('authentication.oauth.github.clientId')}</Label>
                        <Input id="github-client-id" placeholder={lang('authentication.oauth.github.clientIdPlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="github-client-secret">{lang('authentication.oauth.github.clientSecret')}</Label>
                        <Input id="github-client-secret" type="password" placeholder={lang('authentication.oauth.github.clientSecretPlaceholder')} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button className="bg-black text-white hover:bg-gray-800">
            {lang('saveButton')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
} 
