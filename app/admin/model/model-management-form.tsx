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
import { RefreshCw, Search, Save, ChevronDown, Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataPagination } from "@/components/ui/data-pagination"
import { usePagination } from "@/hooks/use-pagination"

interface LLMModel {
  id: string
  serverId: string
  modelId: string
  provider: string
  enabled: boolean
  isPublic: boolean
  supportsMultimodal: boolean
  supportsImageGeneration: boolean
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

type FilterValue = 'all' | 'true' | 'false'

interface ModelFilters {
  enabled: FilterValue
  isPublic: FilterValue
  supportsMultimodal: FilterValue
  supportsImageGeneration: FilterValue
  isEmbeddingModel: FilterValue
  isRerankingModel: FilterValue
}

export default function ModelManagementForm({ initialServers }: ModelManagementFormProps) {
  const router = useRouter()
  const { lang } = useTranslation('admin.model')
  const { lang: commonLang } = useTranslation('common')
  const [servers, setServers] = useState<LLMServer[]>(initialServers)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({})
  const [modifiedModels, setModifiedModels] = useState<Set<string>>(new Set())
  
  // Search states for each server
  const [serverSearchTerms, setServerSearchTerms] = useState<Record<string, string>>({})
  
  // Filter states for each server
  const [serverFilters, setServerFilters] = useState<Record<string, ModelFilters>>({})
  
  const ITEMS_PER_PAGE = 10

  // Get filters for a specific server (with defaults)
  const getServerFilters = (serverId: string): ModelFilters => {
    return serverFilters[serverId] || {
      enabled: 'all',
      isPublic: 'all',
      supportsMultimodal: 'all',
      supportsImageGeneration: 'all',
      isEmbeddingModel: 'all',
      isRerankingModel: 'all'
    }
  }

  // Model search filter - now using global search term
  const filteredServers = servers.map(server => ({
    ...server,
    models: server.models.filter(model => 
      model.modelId.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(server => server.models.length > 0)

  // Apply filters to models
  const applyFilters = (models: LLMModel[], filters: ModelFilters) => {
    return models.filter(model => {
      // Apply boolean filters
      if (filters.enabled !== 'all' && String(model.enabled) !== filters.enabled) return false
      if (filters.isPublic !== 'all' && String(model.isPublic) !== filters.isPublic) return false
      if (filters.supportsMultimodal !== 'all' && String(model.supportsMultimodal) !== filters.supportsMultimodal) return false
      if (filters.supportsImageGeneration !== 'all' && String(model.supportsImageGeneration) !== filters.supportsImageGeneration) return false
      if (filters.isEmbeddingModel !== 'all' && String(model.isEmbeddingModel) !== filters.isEmbeddingModel) return false
      if (filters.isRerankingModel !== 'all' && String(model.isRerankingModel) !== filters.isRerankingModel) return false
      
      return true
    })
  }

  // Create pagination hooks for each server
  const serverPaginations = servers.reduce((acc, server) => {
    const serverSearchTerm = serverSearchTerms[server.id] || ''
    const filters = getServerFilters(server.id)
    
    // Apply global search, server search, and filters
    let filteredModels = server.models.filter(model => 
      model.modelId.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (serverSearchTerm === '' || model.modelId.toLowerCase().includes(serverSearchTerm.toLowerCase()))
    )
    
    // Apply column filters
    filteredModels = applyFilters(filteredModels, filters)
    
    acc[server.id] = usePagination({
      items: filteredModels,
      itemsPerPage: ITEMS_PER_PAGE,
      searchTerm: serverSearchTerm,
      searchFields: ['modelId']
    })
    
    return acc
  }, {} as Record<string, any>)

  // Calculate model statistics for each server
  const getModelStats = (models: LLMModel[]) => {
    const filteredModels = models.filter(model => 
      model.modelId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return {
      total: filteredModels.length,
      enabled: filteredModels.filter(m => m.enabled).length,
      public: filteredModels.filter(m => m.isPublic).length,
      multimodal: filteredModels.filter(m => m.supportsMultimodal).length,
      imageGeneration: filteredModels.filter(m => m.supportsImageGeneration).length,
      embedding: filteredModels.filter(m => m.isEmbeddingModel).length,
      reranking: filteredModels.filter(m => m.isRerankingModel).length
    }
  }

  // Filter management functions
  const setServerFilter = (serverId: string, filterKey: keyof ModelFilters, value: FilterValue) => {
    setServerFilters(prev => ({
      ...prev,
      [serverId]: {
        ...getServerFilters(serverId),
        [filterKey]: value
      }
    }))
  }

  const resetServerFilters = (serverId: string) => {
    setServerFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[serverId]
      return newFilters
    })
  }

  const hasActiveFilters = (serverId: string) => {
    const filters = getServerFilters(serverId)
    return Object.values(filters).some(value => value !== 'all')
  }

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
  const updateModel = (modelId: string, field: 'enabled' | 'isPublic' | 'supportsMultimodal' | 'supportsImageGeneration' | 'isEmbeddingModel' | 'isRerankingModel', value: boolean) => {
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
              supportsImageGeneration: model.supportsImageGeneration,
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
        toast.warning(`${successCount}개 모델이 저장되었지만 ${errors.length}개 failed: ${errors.join(', ')}`)
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
        {filteredServers.map(server => {
          const pagination = serverPaginations[server.id]
          const serverSearchTerm = serverSearchTerms[server.id] || ''
          const stats = getModelStats(server.models)
          const filters = getServerFilters(server.id)
          
          // Filter dropdown component
          const FilterDropdown = ({ 
            filterKey, 
            label 
          }: { 
            filterKey: keyof ModelFilters
            label: string 
          }) => (
            <div className="flex items-center justify-center gap-1 min-h-[2.5rem]">
              <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 flex-shrink-0">
                    <ChevronDown className={`h-3 w-3 ${filters[filterKey] !== 'all' ? 'text-blue-600' : ''}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-24">
                  <DropdownMenuItem 
                    onClick={() => setServerFilter(server.id, filterKey, 'all')}
                    className={filters[filterKey] === 'all' ? 'bg-blue-50' : ''}
                  >
                    {lang('filters.all')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setServerFilter(server.id, filterKey, 'true')}
                    className={filters[filterKey] === 'true' ? 'bg-blue-50' : ''}
                  >
                    {lang('filters.on')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setServerFilter(server.id, filterKey, 'false')}
                    className={filters[filterKey] === 'false' ? 'bg-blue-50' : ''}
                  >
                    {lang('filters.off')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
          
          return (
          <Card key={server.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{server.name}</CardTitle>
                  <CardDescription>
                    <div className="mb-2">
                      {server.provider.toUpperCase()} - {pagination.totalItems} {lang('modelsCount')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        🟢 {lang('tableHeaders.enabled')}: {stats.enabled}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        🔵 {lang('tableHeaders.public')}: {stats.public}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        👁 {lang('tableHeaders.multimodal')}: {stats.multimodal}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        🎨 {lang('tableHeaders.imageGeneration')}: {stats.imageGeneration}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        📊 {lang('tableHeaders.embedding')}: {stats.embedding}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        🔄 {lang('tableHeaders.reranking')}: {stats.reranking}
                      </Badge>
                    </div>
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
              {/* Server-specific search and filter controls */}
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder={`${server.name} ${lang('searchPlaceholder')}`}
                    value={serverSearchTerm}
                    onChange={(e) => setServerSearchTerms(prev => ({ ...prev, [server.id]: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                
                {/* Filter status and reset */}
                {hasActiveFilters(server.id) && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-600">{lang('filters.applied')}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetServerFilters(server.id)}
                      className="h-7 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {lang('filters.reset')}
                    </Button>
                  </div>
                )}
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="align-middle">{lang('tableHeaders.serverModel')}</TableHead>
                    <TableHead className="text-center w-[110px] align-middle">
                      <FilterDropdown filterKey="enabled" label={lang('tableHeaders.enabled')} />
                    </TableHead>
                    <TableHead className="text-center w-[90px] align-middle">
                      <FilterDropdown filterKey="isPublic" label={lang('tableHeaders.public')} />
                    </TableHead>
                    <TableHead className="text-center w-[120px] align-middle">
                      <FilterDropdown filterKey="supportsMultimodal" label={lang('tableHeaders.multimodal')} />
                    </TableHead>
                    <TableHead className="text-center w-[130px] align-middle">
                      <FilterDropdown filterKey="supportsImageGeneration" label={lang('tableHeaders.imageGeneration')} />
                    </TableHead>
                    <TableHead className="text-center w-[120px] align-middle">
                      <FilterDropdown filterKey="isEmbeddingModel" label={lang('tableHeaders.embedding')} />
                    </TableHead>
                    <TableHead className="text-center w-[120px] align-middle">
                      <FilterDropdown filterKey="isRerankingModel" label={lang('tableHeaders.reranking')} />
                    </TableHead>
                    <TableHead className="w-[120px] align-middle">{lang('tableHeaders.updatedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        {serverSearchTerm ? lang('noSearchResults') : lang('noModelsMessage')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagination.paginatedItems.map((model: LLMModel) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-mono text-sm">
                        <span className="text-gray-500">{model.serverName || server.name} / </span>
                        <span className="font-semibold">{model.modelId}</span>
                      </TableCell>
                      <TableCell className="text-center w-[110px]">
                        <TextSwitch
                          checked={model.enabled}
                          onCheckedChange={(checked) => updateModel(model.id, 'enabled', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[90px]">
                        <TextSwitch
                          checked={model.isPublic}
                          onCheckedChange={(checked) => updateModel(model.id, 'isPublic', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[120px]">
                        <TextSwitch
                          checked={model.supportsMultimodal}
                          onCheckedChange={(checked) => updateModel(model.id, 'supportsMultimodal', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[130px]">
                        <TextSwitch
                          checked={model.supportsImageGeneration}
                          onCheckedChange={(checked) => updateModel(model.id, 'supportsImageGeneration', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[120px]">
                        <TextSwitch
                          checked={model.isEmbeddingModel}
                          onCheckedChange={(checked) => updateModel(model.id, 'isEmbeddingModel', checked)}
                          onText={lang('switch.on')}
                          offText={lang('switch.off')}
                        />
                      </TableCell>
                      <TableCell className="text-center w-[120px]">
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
                  )))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <DataPagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    totalItems={pagination.totalItems}
                    onPageChange={pagination.goToPage}
                    showItemsText={lang('showingItems')}
                    previousText={commonLang('pagination.previous')}
                    nextText={commonLang('pagination.next')}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )})}

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