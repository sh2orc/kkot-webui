"use client"

import { useState } from "react"
import AdminLayout from "../../../components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"

export default function ConnectionSettingsPage() {
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
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">연결 설정</h1>
          <p className="text-gray-600 mt-1">API 서버 연결을 관리합니다.</p>
        </div>

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

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-black text-white hover:bg-gray-800">저장</Button>
        </div>
      </div>
    </AdminLayout>
  )
} 