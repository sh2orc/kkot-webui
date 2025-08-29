"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { Shield, Bot, Brain, Database, HardDrive, Loader2 } from "lucide-react"

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

interface GroupPermissionsDialogProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  onUpdate: () => void
}

const PERMISSION_TYPES = ['read', 'write', 'delete'] as const

export function GroupPermissionsDialog({ isOpen, onClose, group, onUpdate }: GroupPermissionsDialogProps) {
  const { lang, language } = useTranslation('admin.groups')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.groups')
  }, [language])

  useEffect(() => {
    if (isOpen) {
      fetchResources()
      fetchPermissions()
    }
  }, [isOpen, group.id])

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

      // Fetch models
      const modelsRes = await fetch('/api/llm-models')
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
        setVectorStores(data.vectorStores.map((v: any) => ({
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
      const response = await fetch(`/api/groups/${group.id}/permissions`)
      if (response.ok) {
        const data = await response.json()
        setPermissions({
          agent: data.permissions.agent || [],
          model: data.permissions.model || [],
          rag_collection: data.permissions.rag_collection || [],
          vector_store: data.permissions.vector_store || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      toast.error(lang('errors.fetchPermissionsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (
    resourceType: keyof typeof permissions,
    resourceId: string,
    permissionType: typeof PERMISSION_TYPES[number],
    checked: boolean
  ) => {
    setPermissions(prev => {
      const typePermissions = [...prev[resourceType]]
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
      
      return {
        ...prev,
        [resourceType]: typePermissions
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Flatten permissions for API
      const flatPermissions = []
      for (const [resourceType, perms] of Object.entries(permissions)) {
        for (const perm of perms) {
          flatPermissions.push({
            resourceType,
            resourceId: perm.resourceId,
            permissions: perm.permissions
          })
        }
      }

      const response = await fetch(`/api/groups/${group.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions: flatPermissions })
      })

      if (!response.ok) throw new Error('Failed to save permissions')
      
      toast.success(lang('saveSuccess'))
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Failed to save permissions:', error)
      toast.error(lang('errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const hasPermission = (
    resourceType: keyof typeof permissions,
    resourceId: string,
    permissionType: typeof PERMISSION_TYPES[number]
  ) => {
    const perm = permissions[resourceType].find(p => p.resourceId === resourceId)
    return perm ? perm.permissions.includes(permissionType) : false
  }

  const renderResourcePermissions = (
    resources: Resource[],
    resourceType: keyof typeof permissions,
    icon: React.ReactNode
  ) => (
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
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {resources.map(resource => (
              <div key={resource.id} className="border rounded-lg p-4">
                <div className="mb-3">
                  <h4 className="font-medium">{resource.name}</h4>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  )}
                </div>
                <div className="flex gap-4">
                  {PERMISSION_TYPES.map(permType => (
                    <label key={permType} className="flex items-center space-x-2">
                      <Checkbox
                        checked={hasPermission(resourceType, resource.id, permType)}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(resourceType, resource.id, permType, checked as boolean)
                        }
                      />
                      <span className="text-sm">{lang(`permissions.${permType}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {lang('permissionsDialog.title')}: {group.name}
          </DialogTitle>
          <DialogDescription>
            {lang('permissionsDialog.description')}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="agent" className="mt-4">
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
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {lang('dialog.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {lang('dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
