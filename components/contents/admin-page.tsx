"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Settings,
  Link,
  Brain,
  BarChart3,
  Wrench,
  FileText,
  Search,
  ImageIcon,
  Volume2,
  GitBranch,
  Database,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react"
import Layout from "../layout/layout"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("general")
  const [showPassword, setShowPassword] = useState(false)
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [openaiServers, setOpenaiServers] = useState([
    { id: 1, name: "OpenAI API 서버 1", url: "https://api.openai.com/v1", key: "", enabled: true },
  ])
  const [ollamaServers, setOllamaServers] = useState([
    { id: 1, name: "Ollama API 서버 1", url: "http://localhost:11434", key: "", enabled: false },
  ])

  const [openaiEnabled, setOpenaiEnabled] = useState(true)
  const [geminiEnabled, setGeminiEnabled] = useState(true)
  const [ollamaEnabled, setOllamaEnabled] = useState(true)

  const [internetSearchEnabled, setInternetSearchEnabled] = useState(true)
  const [searchEngine, setSearchEngine] = useState("searchxng")
  const [searchXNGUrl, setSearchXNGUrl] = useState("")

  const menuItems = [
    { id: "general", label: "일반", icon: Settings },
    { id: "connection", label: "연결", icon: Link },
    { id: "model", label: "모델", icon: Brain },
    { id: "evaluation", label: "평가", icon: BarChart3 },
    { id: "tools", label: "도구", icon: Wrench },
    { id: "documents", label: "문서", icon: FileText },
    { id: "websearch", label: "웹검색", icon: Search },
    { id: "image", label: "이미지", icon: ImageIcon },
    { id: "audio", label: "오디오", icon: Volume2 },
    { id: "pipeline", label: "파이프라인", icon: GitBranch },
    { id: "database", label: "데이터베이스", icon: Database },
  ]

  const renderGeneralSettings = () => (
    <div className="space-y-6">
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
              <Switch defaultChecked />
            </div>

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
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderConnectionSettings = () => {
    const addOpenaiServer = () => {
      const newId = Math.max(...openaiServers.map((s) => s.id)) + 1
      setOpenaiServers([
        ...openaiServers,
        {
          id: newId,
          name: `OpenAI API 서버 ${newId}`,
          url: "",
          key: "",
          enabled: false,
        },
      ])
    }

    const removeOpenaiServer = (id: number) => {
      setOpenaiServers(openaiServers.filter((s) => s.id !== id))
    }

    const updateOpenaiServer = (id: number, field: string, value: string | boolean) => {
      setOpenaiServers(openaiServers.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
    }

    const addOllamaServer = () => {
      const newId = Math.max(...ollamaServers.map((s) => s.id)) + 1
      setOllamaServers([
        ...ollamaServers,
        {
          id: newId,
          name: `Ollama API 서버 ${newId}`,
          url: "",
          key: "",
          enabled: false,
        },
      ])
    }

    const removeOllamaServer = (id: number) => {
      setOllamaServers(ollamaServers.filter((s) => s.id !== id))
    }

    const updateOllamaServer = (id: number, field: string, value: string | boolean) => {
      setOllamaServers(ollamaServers.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">OpenAI API 서버</h3>
              <Switch
                checked={openaiEnabled}
                onCheckedChange={setOpenaiEnabled}
              />
            </div>
            {openaiEnabled && (
              <Button onClick={addOpenaiServer} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                서버 추가
              </Button>
            )}
          </div>

          {openaiEnabled && openaiServers.map((server) => (
            <Card key={server.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{server.name}</CardTitle>
                    <CardDescription>OpenAI API 연결 설정을 관리합니다.</CardDescription>
                  </div>
                  {openaiServers.length > 1 && (
                    <Button
                      onClick={() => removeOpenaiServer(server.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor={`openai-name-${server.id}`}>서버 이름</Label>
                    <Input
                      id={`openai-name-${server.id}`}
                      value={server.name}
                      onChange={(e) => updateOpenaiServer(server.id, "name", e.target.value)}
                      placeholder="서버 이름"
                    />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor={`openai-url-${server.id}`}>API URL</Label>
                    <Input
                      id={`openai-url-${server.id}`}
                      value={server.url}
                      onChange={(e) => updateOpenaiServer(server.id, "url", e.target.value)}
                      placeholder="OpenAI API URL을 입력하세요"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`openai-key-${server.id}`}>API 키</Label>
                  <div className="relative">
                    <Input
                      id={`openai-key-${server.id}`}
                      type={showPassword ? "text" : "password"}
                      value={server.key}
                      onChange={(e) => updateOpenaiServer(server.id, "key", e.target.value)}
                      placeholder="OpenAI API 키를 입력하세요"
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
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">연결 활성화</Label>
                    <p className="text-sm text-gray-500">이 서버 연결을 활성화합니다.</p>
                  </div>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={(checked) => updateOpenaiServer(server.id, "enabled", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold">Gemini API</h3>
            <Switch
              checked={geminiEnabled}
              onCheckedChange={setGeminiEnabled}
            />
          </div>
          {geminiEnabled && (
            <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Gemini API</CardTitle>
              <CardDescription>Google Gemini API 연결 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-api-key">API 키</Label>
                <div className="relative">
                  <Input
                    id="gemini-api-key"
                    type={showPassword ? "text" : "password"}
                    placeholder="Gemini API 키를 입력하세요"
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
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">연결 활성화</Label>
                  <p className="text-sm text-gray-500">Gemini API 연결을 활성화합니다.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Ollama API 서버</h3>
              <Switch
                checked={ollamaEnabled}
                onCheckedChange={setOllamaEnabled}
              />
            </div>
            {ollamaEnabled && (
              <Button onClick={addOllamaServer} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                서버 추가
              </Button>
            )}
          </div>

          {ollamaEnabled && ollamaServers.map((server) => (
            <Card key={server.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{server.name}</CardTitle>
                    <CardDescription>Ollama API 연결 설정을 관리합니다.</CardDescription>
                  </div>
                  {ollamaServers.length > 1 && (
                    <Button
                      onClick={() => removeOllamaServer(server.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor={`ollama-name-${server.id}`}>서버 이름</Label>
                    <Input
                      id={`ollama-name-${server.id}`}
                      value={server.name}
                      onChange={(e) => updateOllamaServer(server.id, "name", e.target.value)}
                      placeholder="서버 이름"
                    />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor={`ollama-url-${server.id}`}>API URL</Label>
                    <Input
                      id={`ollama-url-${server.id}`}
                      value={server.url}
                      onChange={(e) => updateOllamaServer(server.id, "url", e.target.value)}
                      placeholder="Ollama API URL을 입력하세요"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ollama-key-${server.id}`}>API 키 (선택사항)</Label>
                  <div className="relative">
                    <Input
                      id={`ollama-key-${server.id}`}
                      type={showAppPassword ? "text" : "password"}
                      value={server.key}
                      onChange={(e) => updateOllamaServer(server.id, "key", e.target.value)}
                      placeholder="Ollama API 키를 입력하세요 (필요한 경우)"
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
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">연결 활성화</Label>
                    <p className="text-sm text-gray-500">이 서버 연결을 활성화합니다.</p>
                  </div>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={(checked) => updateOllamaServer(server.id, "enabled", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderModelSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>모델 관리</CardTitle>
          <CardDescription>AI 모델 설정 및 관리를 수행합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-model">기본 모델</Label>
            <Select defaultValue="gemma3">
              <SelectTrigger>
                <SelectValue placeholder="모델 선택" />
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
            <Label htmlFor="max-tokens">최대 토큰 수</Label>
            <Input id="max-tokens" type="number" defaultValue="4096" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input id="temperature" type="number" step="0.1" min="0" max="2" defaultValue="0.7" />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderEvaluationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>평가 설정</CardTitle>
          <CardDescription>모델 성능 평가 및 모니터링 설정입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">자동 평가 활성화</Label>
              <p className="text-sm text-gray-500">모델 응답에 대한 자동 평가를 수행합니다.</p>
            </div>
            <Switch />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eval-interval">평가 주기 (시간)</Label>
            <Input id="eval-interval" type="number" defaultValue="24" />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderToolsSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>도구 설정</CardTitle>
          <CardDescription>외부 도구 및 플러그인 설정을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Code Execution</Label>
              <p className="text-sm text-gray-500">코드 실행 기능을 활성화합니다.</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderWebSearchSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>웹 검색 설정</CardTitle>
          <CardDescription>실시간 인터넷 검색 기능을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">인터넷 검색</Label>
              <p className="text-sm text-gray-500">실시간 인터넷 검색 기능을 제공합니다.</p>
            </div>
            <Switch checked={internetSearchEnabled} onCheckedChange={setInternetSearchEnabled} />
          </div>

          {internetSearchEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              <div className="space-y-2">
                <Label htmlFor="search-engine">검색 엔진</Label>
                <Select value={searchEngine} onValueChange={setSearchEngine}>
                  <SelectTrigger>
                    <SelectValue placeholder="검색 엔진 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="searchxng">SearchXNG</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="bing">Bing</SelectItem>
                    <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {searchEngine === "searchxng" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="searchxng-url">SearchXNG URL</Label>
                    <Input
                      id="searchxng-url"
                      value={searchXNGUrl}
                      onChange={(e) => setSearchXNGUrl(e.target.value)}
                      placeholder="https://your-searchxng-instance.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="searchxng-api-key">API 키 (선택사항)</Label>
                    <Input id="searchxng-api-key" type="password" placeholder="SearchXNG API 키 (필요한 경우)" />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderImageSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>이미지 생성 서비스</CardTitle>
          <CardDescription>이미지 생성을 위한 외부 서비스를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">ComfyUI</Label>
              <Switch />
            </div>

            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              <div className="space-y-2">
                <Label htmlFor="comfyui-url">ComfyUI 서버 URL</Label>
                <Input id="comfyui-url" placeholder="http://localhost:8188" defaultValue="http://localhost:8188" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comfyui-api-key">API 키 (선택사항)</Label>
                <div className="relative">
                  <Input
                    id="comfyui-api-key"
                    type={showPassword ? "text" : "password"}
                    placeholder="ComfyUI API 키 (필요한 경우)"
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

              <div className="space-y-2">
                <Label htmlFor="comfyui-workflow">기본 워크플로우</Label>
                <Select defaultValue="text2img">
                  <SelectTrigger>
                    <SelectValue placeholder="워크플로우 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text2img">Text to Image</SelectItem>
                    <SelectItem value="img2img">Image to Image</SelectItem>
                    <SelectItem value="inpainting">Inpainting</SelectItem>
                    <SelectItem value="upscaling">Upscaling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Midjourney</Label>
              <Switch />
            </div>

            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              <div className="space-y-2">
                <Label htmlFor="midjourney-api-url">Midjourney API URL</Label>
                <Input id="midjourney-api-url" placeholder="https://api.midjourney.com/v1" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="midjourney-api-key">API 키</Label>
                <div className="relative">
                  <Input
                    id="midjourney-api-key"
                    type={showAppPassword ? "text" : "password"}
                    placeholder="Midjourney API 키를 입력하세요"
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

              <div className="space-y-2">
                <Label htmlFor="midjourney-version">모델 버전</Label>
                <Select defaultValue="v6">
                  <SelectTrigger>
                    <SelectValue placeholder="모델 버전 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="v5.2">Midjourney v5.2</SelectItem>
                    <SelectItem value="v6">Midjourney v6</SelectItem>
                    <SelectItem value="niji5">Niji v5</SelectItem>
                    <SelectItem value="niji6">Niji v6</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="midjourney-quality">기본 품질</Label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue placeholder="품질 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.25">낮음 (0.25)</SelectItem>
                    <SelectItem value="0.5">보통 (0.5)</SelectItem>
                    <SelectItem value="1">높음 (1.0)</SelectItem>
                    <SelectItem value="2">최고 (2.0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return renderGeneralSettings()
      case "connection":
        return renderConnectionSettings()
      case "model":
        return renderModelSettings()
      case "evaluation":
        return renderEvaluationSettings()
      case "tools":
        return renderToolsSettings()
      case "websearch":
        return renderWebSearchSettings()
      case "image":
        return renderImageSettings()
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>{menuItems.find((item) => item.id === activeTab)?.label} 설정</CardTitle>
              <CardDescription>이 섹션의 설정은 개발 중입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">곧 추가될 예정입니다.</p>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <Layout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">관리자 설정</h2>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeTab === item.id
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl">
            {renderContent()}

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <Button className="bg-black text-white hover:bg-gray-800">저장</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
