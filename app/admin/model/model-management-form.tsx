"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Search, Save } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface LLMModel {
  id: string
  serverId: string
  modelId: string
  provider: string
  enabled: boolean
  isPublic: boolean
  supportsMultimodal: boolean
  isEmbeddingModel: boolean
  capabilities?: any
  contextLength?: number
  updatedAt: string
  serverName?: string
  serverBaseUrl?: string
}

interface LLMServer {
  id: string
  provider: string
  name: string
  baseUrl: string
  apiKey?: string
  enabled: boolean
  models: LLMModel[]
}

interface ModelManagementFormProps {
  initialServers: LLMServer[]
}

export default function ModelManagementForm({ initialServers }: ModelManagementFormProps) {
  const router = useRouter()
  const { lang } = useTranslation('admin.model')
  const { toast } = useToast()
  const [servers, setServers] = useState<LLMServer[]>(initialServers)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({})
  const [modifiedModels, setModifiedModels] = useState<Set<string>>(new Set())

  // Model search filter
  const filteredServers = servers.map(server => ({
    ...server,
    models: server.models.filter(model => 
      model.modelId.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(server => server.models.length > 0)

  // Sync models
  const syncModels = async (serverId: string) => {
    try {
      setIsSyncing(prev => ({ ...prev, [serverId]: true }))
      
      const response = await fetch('/api/llm-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverId,
          action: 'sync'
        })
      })
      
      if (!response.ok) {
        throw new Error(lang('syncModelsError'))
      }
      
      const result = await response.json()
      
      // Refresh server list
      const modelsResponse = await fetch('/api/llm-models')
      const allModels = await modelsResponse.json()
      
      // Regroup models by server
      const modelsByServer = allModels.reduce((acc: Record<string, LLMModel[]>, model: LLMModel) => {
        if (!acc[model.serverId]) {
          acc[model.serverId] = []
        }
        acc[model.serverId].push(model)
        return acc
      }, {})
      
      // Update server state
      setServers(prev => prev.map(server => ({
        ...server,
        models: modelsByServer[server.id] || []
      })))
      
      toast({
        title: lang('syncModelsSuccess'),
        description: `${result.count}${lang('syncModelsSuccessMessage')}`
      })
    } catch (error) {
      console.error('Model sync error:', error)
      toast({
        title: lang('syncModelsFailure'),
        description: lang('syncModelsFailureMessage'),
        variant: "destructive"
      })
    } finally {
      setIsSyncing(prev => ({ ...prev, [serverId]: false }))
    }
  }

  // Update model settings
  const updateModel = (modelId: string, field: 'enabled' | 'isPublic' | 'supportsMultimodal' | 'isEmbeddingModel', value: boolean) => {
    setServers(prev => prev.map(server => ({
      ...server,
      models: server.models.map(model => 
        model.id === modelId ? { ...model, [field]: value } : model
      )
    })))
    setModifiedModels(prev => new Set(prev).add(modelId))
  }

  // Save
  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // Update only modified models
      const modelsToUpdate = servers
        .flatMap(server => server.models)
        .filter(model => modifiedModels.has(model.id))
      
      for (const model of modelsToUpdate) {
        const response = await fetch('/api/llm-models', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: model.id,
            enabled: model.enabled,
            isPublic: model.isPublic,
            supportsMultimodal: model.supportsMultimodal,
            isEmbeddingModel: model.isEmbeddingModel
          })
        })
        
        if (!response.ok) {
          throw new Error(`${lang('updateModelError')} ${model.modelId}`)
        }
      }
      
      setModifiedModels(new Set())
      
      toast({
        title: lang('saveSuccess'),
        description: `${modelsToUpdate.length}${lang('saveSuccessMessage')}`
      })
      
      // Update button state immediately after saving
      setIsSaving(false)
      
      // Refresh page after saving to sync server state
      setTimeout(() => {
        console.log('Model settings saved successfully, refreshing page')
        router.refresh()
      }, 1000)
    } catch (error) {
      console.error('Settings save error:', error)
      toast({
        title: lang('saveFailure'),
        description: error instanceof Error ? error.message : lang('saveFailureMessage'),
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">{lang('description')}</p>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={lang('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Model list by server */}
        {filteredServers.map(server => (
          <Card key={server.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{server.name}</CardTitle>
                  <CardDescription>
                    {server.provider.toUpperCase()} - {server.models.length} {lang('modelsCount')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncModels(server.id)}
                  disabled={isSyncing[server.id]}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing[server.id] ? 'animate-spin' : ''}`} />
                  {lang('syncModels')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lang('tableHeaders.serverModel')}</TableHead>
                    <TableHead className="text-center">{lang('tableHeaders.enabled')}</TableHead>
                    <TableHead className="text-center">{lang('tableHeaders.public')}</TableHead>
                    <TableHead className="text-center">{lang('tableHeaders.multimodal')}</TableHead>
                    <TableHead>{lang('tableHeaders.updatedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {server.models.map(model => (
                    <TableRow key={model.id}>
                      <TableCell className="font-mono text-sm">
                        <span className="text-gray-500">{model.serverName || server.name} / </span>
                        <span className="font-semibold">{model.modelId}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={model.enabled}
                          onCheckedChange={(checked) => updateModel(model.id, 'enabled', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={model.isPublic}
                          onCheckedChange={(checked) => updateModel(model.id, 'isPublic', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={model.supportsMultimodal}
                          onCheckedChange={(checked) => updateModel(model.id, 'supportsMultimodal', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(model.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {server.models.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        {lang('noModelsMessage')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {filteredServers.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? lang('noSearchResults') : lang('noEnabledServers')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={isSaving || modifiedModels.size === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? lang('savingButton') : `${lang('saveChanges')} (${modifiedModels.size})`}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
} 