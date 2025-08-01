"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { useTranslation } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Plus, Trash2, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LLMServer {
  id: string
  provider: string
  name: string
  baseUrl: string
  apiKey?: string
  models: string[]
  enabled: boolean
  isDefault: boolean
  settings?: any
  modelCount?: number
}

interface ConnectionSettingsFormProps {
  initialServers: Record<string, LLMServer[]>
}

export default function ConnectionSettingsForm({ initialServers }: ConnectionSettingsFormProps) {
  const router = useRouter()
  const { lang } = useTranslation('admin.connection')
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [testingConnections, setTestingConnections] = useState<Record<string, boolean>>({})
  const [connectionStatus, setConnectionStatus] = useState<Record<string, { success: boolean; message: string }>>({})
  
  // Server state by provider
  const [servers, setServers] = useState<Record<string, LLMServer[]>>(initialServers)
  
  // Provider enabled state
  const [providerEnabled, setProviderEnabled] = useState<Record<string, boolean>>({
    openai: initialServers.openai?.some(s => s.enabled) || false,
    gemini: initialServers.gemini?.some(s => s.enabled) || false,
    ollama: initialServers.ollama?.some(s => s.enabled) || false,
  })

  // Check if there are any enabled servers
  const hasEnabledServers = Object.values(servers).some(providerServers => 
    providerServers.some(server => server.enabled)
  )

  // Connection test
  const testConnection = async (provider: string, serverId: string) => {
    const server = servers[provider]?.find(s => s.id === serverId)
    if (!server) return
    
    setTestingConnections(prev => ({ ...prev, [serverId]: true }))
    
    try {
      const response = await fetch('/api/llm-servers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: server.provider,
          baseUrl: server.baseUrl,
          apiKey: server.apiKey
        })
      })
      
      const result = await response.json()
      
      setConnectionStatus(prev => ({
        ...prev,
        [serverId]: {
          success: result.success,
          message: result.message
        }
      }))
      
      if (result.success) {
        toast({
          title: lang('testConnectionSuccess'),
          description: result.message
        })
      } else {
        toast({
          title: lang('testConnectionFailure'),
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [serverId]: {
          success: false,
          message: lang('testConnectionErrorMessage')
        }
      }))
      
      toast({
        title: lang('testConnectionError'),
        description: lang('testConnectionErrorMessage'),
        variant: "destructive"
      })
    } finally {
      setTestingConnections(prev => ({ ...prev, [serverId]: false }))
    }
  }

  // Password toggle
  const togglePassword = (serverId: string) => {
    setShowPasswords(prev => ({ ...prev, [serverId]: !prev[serverId] }))
  }

  // Add server
  const addServer = (provider: string) => {
    const newServer: LLMServer = {
      id: `new-${Date.now()}`,
      provider,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Server`,
      baseUrl: provider === 'openai' ? 'https://api.openai.com/v1' : 
               provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' :
               'http://localhost:11434',
      apiKey: '',
      models: [],
      enabled: false,
      isDefault: false,
      settings: {}
    }
    
    setServers(prev => ({
      ...prev,
      [provider]: [...(prev[provider] || []), newServer]
    }))
  }

  // Remove server
  const removeServer = async (provider: string, serverId: string) => {
    // Delete immediately if it's a newly added server
    if (serverId.startsWith('new-')) {
      setServers(prev => ({
        ...prev,
        [provider]: prev[provider].filter(s => s.id !== serverId)
      }))
      return
    }

    // Call API for existing servers
    try {
      const response = await fetch(`/api/llm-servers?id=${serverId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(lang('deleteServerError'))
      }
      
      setServers(prev => ({
        ...prev,
        [provider]: prev[provider].filter(s => s.id !== serverId)
      }))
      
      toast({
        title: lang('deleteServerSuccess'),
        description: lang('deleteServerSuccessMessage')
      })
    } catch (error) {
      toast({
        title: lang('deleteServerFailure'),
        description: lang('deleteServerFailureMessage'),
        variant: "destructive"
      })
    }
  }

  // Update server
  const updateServer = (provider: string, serverId: string, field: string, value: any) => {
    setServers(prev => ({
      ...prev,
      [provider]: prev[provider].map(server => 
        server.id === serverId ? { ...server, [field]: value } : server
      )
    }))
  }

  // Toggle provider
  const toggleProvider = (provider: string, enabled: boolean) => {
    setProviderEnabled(prev => ({ ...prev, [provider]: enabled }))
    
    // Disable all servers when provider is disabled
    if (!enabled) {
      setServers(prev => ({
        ...prev,
        [provider]: prev[provider]?.map(server => ({ ...server, enabled: false })) || []
      }))
    }
  }

  // Save handler
  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // Update all servers
      const allServers = Object.values(servers).flat()
      const updatedServers: Record<string, LLMServer[]> = {}
      
      console.log('저장 시작:', allServers.length, '개 서버 업데이트 중...')
      
      for (const server of allServers) {
        const isNew = server.id.startsWith('new-')
        const endpoint = '/api/llm-servers'
        const method = isNew ? 'POST' : 'PUT'
        
        console.log(`서버 ${server.name} (${server.provider}) 업데이트: enabled=${server.enabled}`)
        
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...server,
            id: isNew ? undefined : server.id
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error(`${server.name} 저장 실패:`, response.status, errorData)
          throw new Error(`${lang('saveServerError')} ${server.name}: ${errorData.error || response.statusText}`)
        }
        
        const result = await response.json()
        console.log(`서버 ${server.name} 저장 성공:`, result)
        
        // Update with ID from response for newly created servers
        if (isNew) {
          const newServer = result.data
          
          if (!updatedServers[server.provider]) {
            updatedServers[server.provider] = []
          }
          updatedServers[server.provider].push(newServer)
        } else {
          if (!updatedServers[server.provider]) {
            updatedServers[server.provider] = []
          }
          updatedServers[server.provider].push(server)
        }
      }
      
      console.log('모든 서버 저장 완료, 페이지 새로고침 중...')
      
      toast({
        title: lang('saveSuccess'),
        description: lang('saveSuccessMessage')
      })
      
      // 저장 완료 후 버튼 상태 즉시 업데이트
      setIsSaving(false)
      
      // 저장 후 페이지 새로고침하여 서버 상태 동기화
      setTimeout(() => {
        console.log('페이지 새로고침 실행')
        router.refresh()
      }, 1000)
      
    } catch (error) {
      console.error('Settings save error:', error)
      toast({
        title: lang('saveFailure'),
        description: error instanceof Error ? error.message : lang('saveFailureMessage'),
        variant: "destructive"
      })
      setIsSaving(false) // 에러 시에만 여기서 setIsSaving(false) 호출
    }
    // 성공 시에는 페이지가 새로고침되므로 setIsSaving(false) 불필요
  }

  const renderProviderSection = (provider: string, title: string, description: string) => {
    const providerServers = servers[provider] || []
    const isEnabled = providerEnabled[provider]
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => toggleProvider(provider, checked)}
            />
          </div>
          {isEnabled && (
            <Button onClick={() => addServer(provider)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {lang(`${provider}.addServer`)}
            </Button>
          )}
        </div>

        {isEnabled && providerServers.map((server) => {
          const status = connectionStatus[server.id]
          const isTesting = testingConnections[server.id]
          
          return (
            <Card key={server.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{server.name}</CardTitle>
                    <CardDescription>
                      {description}
                      {server.modelCount !== undefined && server.modelCount > 0 && (
                        <span className="ml-2 text-green-600">
                          ({server.modelCount} {lang('modelsSynced')})
                        </span>
                      )}
                      {status && (
                        <span className={`ml-2 ${status.success ? 'text-green-600' : 'text-red-600'}`}>
                          - {status.message}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(provider, server.id)}
                      disabled={isTesting}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                      {lang('testConnection')}
                    </Button>
                    <Button
                      onClick={() => removeServer(provider, server.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor={`${provider}-name-${server.id}`}>{lang(`${provider}.serverName`)}</Label>
                    <Input
                      id={`${provider}-name-${server.id}`}
                      value={server.name}
                      onChange={(e) => updateServer(provider, server.id, "name", e.target.value)}
                      placeholder={lang(`${provider}.serverName`)}
                    />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor={`${provider}-url-${server.id}`}>{lang(`${provider}.apiUrl`)}</Label>
                    <Input
                      id={`${provider}-url-${server.id}`}
                      value={server.baseUrl}
                      onChange={(e) => updateServer(provider, server.id, "baseUrl", e.target.value)}
                      placeholder={lang(`${provider}.apiUrlPlaceholder`)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${provider}-key-${server.id}`}>{lang(`${provider}.apiKey`)}</Label>
                  <div className="relative">
                    <Input
                      id={`${provider}-key-${server.id}`}
                      type={showPasswords[server.id] ? "text" : "password"}
                      value={server.apiKey || ''}
                      onChange={(e) => updateServer(provider, server.id, "apiKey", e.target.value)}
                      placeholder={lang(`${provider}.apiKeyPlaceholder`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => togglePassword(server.id)}
                    >
                      {showPasswords[server.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{lang(`${provider}.enableConnection`)}</Label>
                    <p className="text-sm text-gray-500">{lang(`${provider}.enableConnectionDescription`)}</p>
                  </div>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={(checked) => updateServer(provider, server.id, "enabled", checked)}
                  />
                </div>
                {server.isDefault && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {lang('defaultServer')}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">{lang('description')}</p>
        </div>

        {!hasEnabledServers && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {lang('noEnabledServersWarning')}
            </AlertDescription>
          </Alert>
        )}

        {renderProviderSection('openai', lang('openai.title'), lang('openai.description'))}
        {renderProviderSection('gemini', lang('gemini.title'), lang('gemini.description'))}
        {renderProviderSection('ollama', lang('ollama.title'), lang('ollama.description'))}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={isSaving || !hasEnabledServers}
          >
            {isSaving ? lang('savingButton') : lang('saveButton')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
} 