"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TextSwitch } from "@/components/ui/text-switch"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
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
  isRerankingModel: boolean
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
      
      toast.success(`${lang('syncModelsSuccess')}: ${result.count}${lang('syncModelsSuccessMessage')}`)
    } catch (error) {
      console.error('Model sync error:', error)
      toast.error(`${lang('syncModelsFailure')}: ${lang('syncModelsFailureMessage')}`)
    } finally {
      setIsSyncing(prev => ({ ...prev, [serverId]: false }))
    }
  }

  // Update model settings
  const updateModel = (modelId: string, field: 'enabled' | 'isPublic' | 'supportsMultimodal' | 'isEmbeddingModel' | 'isRerankingModel', value: boolean) => {
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
      
      if (modelsToUpdate.length === 0) {
        toast.warning(lang('noChangesToSave') || 'No changes to save.')
        setIsSaving(false)
        return
      }
      
      let successCount = 0
      const errors: string[] = []
      
      for (const model of modelsToUpdate) {
        try {
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
              isEmbeddingModel: model.isEmbeddingModel,
              isRerankingModel: model.isRerankingModel
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            const errorMessage = errorData.error || `${lang('updateModelError')} ${model.modelId}`
            errors.push(`${model.modelId}: ${errorMessage}`)
          } else {
            successCount++
          }
        } catch (error) {
          errors.push(`${model.modelId}: ${error instanceof Error ? error.message : 'Network error'}`)
        }
      }
      
      // Show results
      if (errors.length === 0) {
        // All successful
        setModifiedModels(new Set())
        toast.success(`${lang('saveSuccess')}: ${successCount}${lang('saveSuccessMessage')}`)
        
        // Refresh page after saving to sync server state
        setTimeout(() => {
          console.log('Model settings saved successfully, refreshing page')
          router.refresh()
        }, 1000)
      } else if (successCount > 0) {
        // Partial success
        toast.warning(`${successCount}개 모델이 저장되었지만 ${errors.length}개 실패: ${errors.join(', ')}`)
      } else {
        // All failed
        toast.error(`${lang('saveFailure')}: ${errors.join(', ')}`)
      }
    } catch (error) {
      console.error('Settings save error:', error)
      toast.error(`${lang('saveFailure')}: ${error instanceof Error ? error.message : lang('saveFailureMessage')}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
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
                    <TableHead className="text-center w-[100px]">{lang('tableHeaders.enabled')}</TableHead>
                    <TableHead className="text-center w-[100px]">{lang('tableHeaders.public')}</TableHead>
                    <TableHead className="text-center w-[100px]">{lang('tableHeaders.multimodal')}</TableHead>
                    <TableHead className="text-center w-[100px]">{lang('tableHeaders.embedding')}</TableHead>
                    <TableHead className="text-center w-[100px]">{lang('tableHeaders.reranking')}</TableHead>
                    <TableHead className="w-[120px]">{lang('tableHeaders.updatedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {server.models.map(model => (
                    <TableRow key={model.id}>
                      <TableCell className="font-mono text-sm">
                        <span className="text-gray-500">{model.serverName || server.name} / </span>
                        <span className="font-semibold">{model.modelId}</span>
                      </TableCell>
                      <TableCell className="text-center w-[100px]">
                        <TextSwitch
                          checked={model.enabled}
                          onCheckedChange={(checked) => updateModel(model.id, 'enabled', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[100px]">
                        <TextSwitch
                          checked={model.isPublic}
                          onCheckedChange={(checked) => updateModel(model.id, 'isPublic', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[100px]">
                        <TextSwitch
                          checked={model.supportsMultimodal}
                          onCheckedChange={(checked) => updateModel(model.id, 'supportsMultimodal', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[100px]">
                        <TextSwitch
                          checked={model.isEmbeddingModel}
                          onCheckedChange={(checked) => updateModel(model.id, 'isEmbeddingModel', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[100px]">
                        <TextSwitch
                          checked={model.isRerankingModel}
                          onCheckedChange={(checked) => updateModel(model.id, 'isRerankingModel', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 w-[120px]">
                        {new Date(model.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {server.models.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
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
  )
} 