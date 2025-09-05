"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Shield, Bot, Brain, Database, HardDrive, Loader2, Search } from "lucide-react"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Group {
  id: string
  name: string
}

interface Resource {
  id: string
  name: string
  description?: string
}

interface Permission {
  resourceId: string
  permissions: string[]
}

const PERMISSION_TYPES = ['enabled'] as const

export default function GroupPermissionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang, language } = useTranslation('admin.groups')
  
  const groupId = searchParams.get('id')
  
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingResource, setSavingResource] = useState<string | null>(null)
  const [agents, setAgents] = useState<Resource[]>([])
  const [models, setModels] = useState<Resource[]>([])
  const [collections, setCollections] = useState<Resource[]>([])
  const [vectorStores, setVectorStores] = useState<Resource[]>([])
  const [permissions, setPermissions] = useState<{
    agent: Permission[]
    model: Permission[]
    rag_collection: Permission[]
    vector_store: Permission[]
  }>({
    agent: [],
    model: [],
    rag_collection: [],
    vector_store: []
  })
  
  // Search states for each resource type
  const [searchTerms, setSearchTerms] = useState<{
    agent: string
    model: string
    rag_collection: string
    vector_store: string
  }>({
    agent: '',
    model: '',
    rag_collection: '',
    vector_store: ''
  })
  
  // Pagination states for each resource type
  const [currentPages, setCurrentPages] = useState<{
    agent: number
    model: number
    rag_collection: number
    vector_store: number
  }>({
    agent: 1,
    model: 1,
    rag_collection: 1,
    vector_store: 1
  })
  
  const ITEMS_PER_PAGE = 10

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.groups')
  }, [language])

  useEffect(() => {
    if (groupId) {
      fetchGroup()
      fetchResources()
      fetchPermissions()
    } else {
      router.push('/admin/groups')
    }
  }, [groupId])

  // Reset to page 1 when search terms change
  useEffect(() => {
    setCurrentPages({
      agent: 1,
      model: 1,
      rag_collection: 1,
      vector_store: 1
    })
  }, [searchTerms])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (!response.ok) throw new Error("Failed to fetch group")
      const data = await response.json()
      setGroup(data)
    } catch (error) {
      toast.error(lang('errors.fetchFailed'))
      router.push('/admin/groups')
    }
  }

  const fetchResources = async () => {
    try {
      // Fetch agents
      const agentsRes = await fetch('/api/agents')
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.agents.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description
        })))
      }

      // Fetch models - for admin permission management, we need all models
      const modelsRes = await fetch('/api/llm-models?adminView=true')
      if (modelsRes.ok) {
        const data = await modelsRes.json()
        setModels(data.map((m: any) => ({
          id: m.id,
          name: m.modelId,
          description: m.provider
        })))
      }

      // Fetch RAG collections
      const collectionsRes = await fetch('/api/rag/collections')
      if (collectionsRes.ok) {
        const data = await collectionsRes.json()
        setCollections(data.collections.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description
        })))
      }

      // Fetch vector stores
      const vectorStoresRes = await fetch('/api/rag/vector-stores')
      if (vectorStoresRes.ok) {
        const data = await vectorStoresRes.json()
        setVectorStores(data.stores.map((v: any) => ({
          id: v.id,
          name: v.name,
          description: v.type
        })))
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error)
      toast.error(lang('errors.fetchResourcesFailed'))
    }
  }

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/groups/${groupId}/permissions`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched permissions:', data)
        setPermissions({
          agent: data.permissions.agent || [],
          model: data.permissions.model || [],
          rag_collection: data.permissions.rag_collection || [],
          vector_store: data.permissions.vector_store || []
        })
      } else {
        console.error('Failed to fetch permissions:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      toast.error(lang('errors.fetchPermissionsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = async (
    resourceType: keyof typeof permissions,
    resourceId: string,
    permissionType: typeof PERMISSION_TYPES[number],
    checked: boolean
  ) => {
    // Set saving state for this specific resource
    setSavingResource(resourceId)
    
    // Update local state first for immediate UI feedback
    const updatedPermissions = { ...permissions }
    const typePermissions = [...updatedPermissions[resourceType]]
    const existingIndex = typePermissions.findIndex(p => p.resourceId === resourceId)
    
    if (existingIndex >= 0) {
      const existing = typePermissions[existingIndex]
      if (checked) {
        if (!existing.permissions.includes(permissionType)) {
          existing.permissions.push(permissionType)
        }
      } else {
        existing.permissions = existing.permissions.filter(p => p !== permissionType)
      }
      if (existing.permissions.length === 0) {
        typePermissions.splice(existingIndex, 1)
      }
    } else if (checked) {
      typePermissions.push({
        resourceId,
        permissions: [permissionType]
      })
    }
    
    updatedPermissions[resourceType] = typePermissions
    setPermissions(updatedPermissions)
    
    // Save to API
    try {
      // Flatten permissions for API
      const flatPermissions = []
      for (const [type, perms] of Object.entries(updatedPermissions)) {
        for (const perm of perms) {
          flatPermissions.push({
            resourceType: type,
            resourceId: perm.resourceId,
            permissions: perm.permissions
          })
        }
      }

      console.log('Saving permissions:', {
        groupId,
        resourceType,
        resourceId,
        checked,
        flatPermissions,
        updatedPermissions
      })
      
      console.log('Current permissions state before API call:', permissions)

      const response = await fetch(`/api/groups/${groupId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions: flatPermissions })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Permission save error:', errorData)
        throw new Error(errorData.error || 'Failed to save permissions')
      }
      
      toast.success(lang('permissionUpdated'))
    } catch (error) {
      console.error('Failed to save permissions:', error)
      toast.error(lang('errors.saveFailed'))
      
      // Revert the change on error
      fetchPermissions()
    } finally {
      setSavingResource(null)
    }
  }


  const hasPermission = (
    resourceType: keyof typeof permissions,
    resourceId: string,
    permissionType: typeof PERMISSION_TYPES[number]
  ) => {
    // Admin group always has all permissions
    if (groupId === 'admin') {
      return true
    }
    const perm = permissions[resourceType].find(p => p.resourceId === resourceId)
    return perm ? perm.permissions.includes(permissionType) : false
  }

  const renderResourcePermissions = (
    resources: Resource[],
    resourceType: keyof typeof permissions,
    icon: React.ReactNode
  ) => {
    // Filter resources based on search term
    const searchTerm = searchTerms[resourceType]
    const filteredResources = resources.filter(resource => 
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    // Calculate pagination
    const currentPage = currentPages[resourceType]
    const totalPages = Math.ceil(filteredResources.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedResources = filteredResources.slice(startIndex, endIndex)
    
    const handlePageChange = (page: number) => {
      setCurrentPages(prev => ({ ...prev, [resourceType]: page }))
    }
    
    return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          <span>{lang(`resourceTypes.${resourceType}`)}</span>
          <Badge variant="secondary">{resources.length}</Badge>
        </CardTitle>
        <CardDescription>
          {lang(`resourceDescriptions.${resourceType}`)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder={lang('searchResourcePlaceholder')}
              value={searchTerms[resourceType]}
              onChange={(e) => setSearchTerms(prev => ({ ...prev, [resourceType]: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>
        <ScrollArea className="h-[450px] pr-4">
          <div className="space-y-4">
            {filteredResources.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {lang('noSearchResults')}
              </div>
            ) : (
              paginatedResources.map(resource => (
              <div key={resource.id} className="border rounded-lg p-4 flex items-center gap-4">
                <div className="relative">
                  <Switch
                    checked={hasPermission(resourceType, resource.id, 'enabled')}
                    onCheckedChange={(checked) => 
                      handlePermissionChange(resourceType, resource.id, 'enabled', checked as boolean)
                    }
                    disabled={groupId === 'admin' || savingResource === resource.id}
                  />
                  {savingResource === resource.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{resource.name}</h4>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        </ScrollArea>
        
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1
                  // Show first page, last page, current page, and pages around current page
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <PaginationItem key={pageNumber}>...</PaginationItem>
                  }
                  return null
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            
            <div className="text-center text-sm text-muted-foreground mt-2">
              {lang('showingItems')
                .replace('{{start}}', String(startIndex + 1))
                .replace('{{end}}', String(Math.min(endIndex, filteredResources.length)))
                .replace('{{total}}', String(filteredResources.length))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/groups')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Tabs skeleton */}
          <div className="grid w-full grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          
          {/* Card skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <Skeleton className="h-4 w-80 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3 w-64 mt-1" />
                    </div>
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/groups')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{lang('managePermissions')}</h1>
            <p className="text-muted-foreground mt-1">
              {group?.name} {lang('permissionManagementDesc')}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/groups')}>
          {lang('backToGroups')}
        </Button>
      </div>

      <Tabs defaultValue="agent" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agent">{lang('tabs.agents')}</TabsTrigger>
          <TabsTrigger value="model">{lang('tabs.models')}</TabsTrigger>
          <TabsTrigger value="rag_collection">{lang('tabs.collections')}</TabsTrigger>
          <TabsTrigger value="vector_store">{lang('tabs.vectorStores')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agent">
          {renderResourcePermissions(agents, 'agent', <Bot className="h-4 w-4" />)}
        </TabsContent>
        
        <TabsContent value="model">
          {renderResourcePermissions(models, 'model', <Brain className="h-4 w-4" />)}
        </TabsContent>
        
        <TabsContent value="rag_collection">
          {renderResourcePermissions(collections, 'rag_collection', <Database className="h-4 w-4" />)}
        </TabsContent>
        
        <TabsContent value="vector_store">
          {renderResourcePermissions(vectorStores, 'vector_store', <HardDrive className="h-4 w-4" />)}
        </TabsContent>
      </Tabs>

      {groupId === 'admin' && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardContent className="flex items-center gap-2 pt-6">
            <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {lang('adminGroupPermissionNotice')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
