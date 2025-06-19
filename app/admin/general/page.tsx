"use client"

import { useState } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff } from "lucide-react"

export default function GeneralSettingsPage() {
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // OAuth 제공자 활성화 상태 관리
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false)
  const [kakaoEnabled, setKakaoEnabled] = useState(false)
  const [naverEnabled, setNaverEnabled] = useState(false)
  const [githubEnabled, setGithubEnabled] = useState(false)
  
  // LDAP 활성화 상태 관리
  const [ldapEnabled, setLdapEnabled] = useState(false)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">일반 설정</h1>
          <p className="text-gray-600 mt-1">시스템의 기본 동작을 설정합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>기본 시스템 설정</CardTitle>
            <CardDescription>시스템의 기본 동작을 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">새 회원가입 활성화</Label>
                <p className="text-sm text-gray-500">새로운 사용자의 회원가입을 허용합니다.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">API 키 활성화</Label>
                <p className="text-sm text-gray-500">API 키를 통한 접근을 허용합니다.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">API 키 엔드포인트 제한</Label>
                <p className="text-sm text-gray-500">API 키 사용을 특정 엔드포인트로 제한합니다.</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>JWT 설정</CardTitle>
            <CardDescription>JSON Web Token 관련 설정을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jwt-expiry">JWT 만료 시간 (초)</Label>
              <Input id="jwt-expiry" type="number" defaultValue="-1" />
              <p className="text-xs text-gray-500">
                값이 -1이면 만료되지 않습니다. 예: '3h', '2d', '1w' 형식으로 입력할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>사용자 인증 방법을 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">LDAP</Label>
                <Switch checked={ldapEnabled} onCheckedChange={setLdapEnabled} />
              </div>

              {ldapEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <div className="space-y-2">
                    <Label htmlFor="ldap-label">Label</Label>
                    <Input id="ldap-label" defaultValue="LDAP Server" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ldap-host">Host</Label>
                      <Input id="ldap-host" defaultValue="localhost" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ldap-port">포트</Label>
                      <Input id="ldap-port" type="number" defaultValue="389" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-dn">Application DN</Label>
                      <Input id="app-dn" placeholder="Enter Application DN" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app-dn-password">Application DN Password</Label>
                      <div className="relative">
                        <Input
                          id="app-dn-password"
                          type={showAppPassword ? "text" : "password"}
                          placeholder="Enter Application DN Password"
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
                    <Label htmlFor="mail-attr">Attribute for Mail</Label>
                    <Input id="mail-attr" defaultValue="mail" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username-attr">Attribute for Username</Label>
                    <Input id="username-attr" defaultValue="uid" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search-base">Search Base</Label>
                    <Input id="search-base" placeholder="Example: ou=users,dc=foo,dc=example" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search-filter">필터 검색</Label>
                    <Input id="search-filter" placeholder="Example: (&(objectClass=inetOrgPerson)(uid=%s))" />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* OAuth Authentication Providers */}
            <div className="space-y-6">
              <h4 className="text-base font-semibold">OAuth 인증</h4>
              
              {/* Google OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Google 인증</Label>
                  <Switch checked={googleEnabled} onCheckedChange={setGoogleEnabled} />
                </div>

                {googleEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="google-client-id">Client ID</Label>
                        <Input id="google-client-id" placeholder="Google OAuth Client ID를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="google-client-secret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="google-client-secret"
                            type={showPassword ? "text" : "password"}
                            placeholder="Google OAuth Client Secret을 입력하세요"
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
                  <Label className="text-base font-medium">Microsoft 인증</Label>
                  <Switch checked={microsoftEnabled} onCheckedChange={setMicrosoftEnabled} />
                </div>

                {microsoftEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="microsoft-client-id">Client ID</Label>
                        <Input id="microsoft-client-id" placeholder="Microsoft OAuth Client ID를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="microsoft-client-secret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="microsoft-client-secret"
                            type={showPassword ? "text" : "password"}
                            placeholder="Microsoft OAuth Client Secret을 입력하세요"
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

              {/* Kakao OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">카카오 인증</Label>
                  <Switch checked={kakaoEnabled} onCheckedChange={setKakaoEnabled} />
                </div>

                {kakaoEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="kakao-client-id">Client ID (REST API 키)</Label>
                        <Input id="kakao-client-id" placeholder="카카오 REST API 키를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kakao-client-secret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="kakao-client-secret"
                            type={showPassword ? "text" : "password"}
                            placeholder="카카오 Client Secret을 입력하세요"
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

              {/* Naver OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">네이버 인증</Label>
                  <Switch checked={naverEnabled} onCheckedChange={setNaverEnabled} />
                </div>

                {naverEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="naver-client-id">Client ID</Label>
                        <Input id="naver-client-id" placeholder="네이버 OAuth Client ID를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="naver-client-secret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="naver-client-secret"
                            type={showPassword ? "text" : "password"}
                            placeholder="네이버 OAuth Client Secret을 입력하세요"
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

              {/* GitHub OAuth */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">GitHub 인증</Label>
                  <Switch checked={githubEnabled} onCheckedChange={setGithubEnabled} />
                </div>

                {githubEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="github-client-id">Client ID</Label>
                        <Input id="github-client-id" placeholder="GitHub OAuth Client ID를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="github-client-secret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="github-client-secret"
                            type={showPassword ? "text" : "password"}
                            placeholder="GitHub OAuth Client Secret을 입력하세요"
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
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-black text-white hover:bg-gray-800">저장</Button>
        </div>
      </div>
    </AdminLayout>
  )
} 