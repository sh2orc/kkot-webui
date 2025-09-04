"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Power, PowerOff, User } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"

interface Agent {
  id: string
  agentId: string  // User-entered agent ID
  name: string
  modelId: string
  modelName?: string
  serverName?: string
  description?: string
  enabled: boolean
  hasImage: boolean
  imageData?: string // Image data passed via SSR
  supportsDeepResearch?: boolean
  supportsWebSearch?: boolean
  compressImage?: boolean
}

interface AgentManagementFormProps {
  initialAgents: Agent[]
  enabledModels: any[]
}

export default function AgentManagementForm({ initialAgents, enabledModels }: AgentManagementFormProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [isLoading, setIsLoading] = useState(false)
  
  const { toast } = useToast()
  const router = useRouter()
  const { lang } = useTranslation('admin.agent')
  
  // No separate loading needed as image data is passed via SSR
  useEffect(() => {
    console.log('Agent list initialization completed (including SSR images)')
  }, [])

  // Toggle agent status
  const handleToggleAgent = async (id: string, enabled: boolean) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          enabled: !enabled
        })
      })
      
      if (!response.ok) {
        throw new Error('Agent toggle failed')
      }
      
      // Update state
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === id ? { ...agent, enabled: !enabled } : agent
        )
      )
      
      toast({
        title: lang(!enabled ? 'enableSuccess' : 'disableSuccess'),
        description: lang(!enabled ? 'enableSuccessMessage' : 'disableSuccessMessage')
      })
    } catch (error) {
      console.error('Agent toggle error:', error)
      toast({
        title: lang('toggleError'),
        description: lang('toggleFailureMessage'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle image compression
  const handleToggleImageCompression = async (id: string, compressImage: boolean) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          compressImage: !compressImage
        })
      })
      
      if (!response.ok) {
        throw new Error('Image compression toggle failed')
      }
      
      // Update state
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === id ? { ...agent, compressImage: !compressImage } : agent
        )
      )
      
      toast({
        title: !compressImage ? '이미지 압축 활성화' : '이미지 압축 비활성화',
        description: !compressImage ? '이미지 압축이 활성화되었습니다.' : '이미지 압축이 비활성화되었습니다.'
      })
    } catch (error) {
      console.error('Image compression toggle error:', error)
      toast({
        title: '설정 변경 실패',
        description: '이미지 압축 설정을 변경하는 중 오류가 발생했습니다.',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle deep research
  const handleToggleDeepResearch = async (id: string, supportsDeepResearch: boolean) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          supportsDeepResearch: !supportsDeepResearch
        })
      })
      
      if (!response.ok) {
        throw new Error('Deep research toggle failed')
      }
      
      // Update state
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === id ? { ...agent, supportsDeepResearch: !supportsDeepResearch } : agent
        )
      )
      
      toast({
        title: !supportsDeepResearch ? '딥리서치 활성화' : '딥리서치 비활성화',
        description: !supportsDeepResearch ? '딥리서치 기능이 활성화되었습니다.' : '딥리서치 기능이 비활성화되었습니다.'
      })
    } catch (error) {
      console.error('Deep research toggle error:', error)
      toast({
        title: '설정 변경 실패',
        description: '딥리서치 설정을 변경하는 중 오류가 발생했습니다.',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Delete agent
  const handleDeleteAgent = async (id: string, name: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/agents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      
      if (!response.ok) {
        throw new Error('Agent deletion failed')
      }
      
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== id))
      
      toast({
        title: lang('deleteSuccess'),
        description: lang('deleteSuccessMessage')
      })
    } catch (error) {
      console.error('Agent deletion error:', error)
      toast({
        title: lang('deleteError'),
        description: lang('deleteFailureMessage'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lang('title')}</h1>
            <p className="text-muted-foreground">{lang('description')}</p>
          </div>
          <Button 
          onClick={() => router.push('/admin/agent/register')}
          >
            <Plus className="h-4 w-4 mr-2" />
            {lang('addAgent')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{lang('agentList')}</CardTitle>
            <CardDescription>
              {lang('agentListDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lang('table.name')}</TableHead>
                    <TableHead>{lang('table.model')}</TableHead>
                    <TableHead>{lang('table.description')}</TableHead>
                    <TableHead>기능</TableHead>
                    <TableHead>딥리서치</TableHead>
                    <TableHead>이미지 압축</TableHead>
                    <TableHead>{lang('table.status')}</TableHead>
                    <TableHead className="w-[120px]">{lang('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {/* Agent image - use SSR data directly */}
                          <div className="relative flex-shrink-0">
                            <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                              {agent.hasImage && agent.imageData ? (
                                <div className="w-full h-full">
                                  <img 
                                    src={agent.imageData} 
                                    alt={agent.name} 
                                    className="w-full h-full object-cover" 
                                    onLoad={() => console.log(`Agent ${agent.id} image display successful (SSR)`)}
                                    onError={() => console.error(`Agent ${agent.id} image display failed`)}
                                  />
                                </div>
                              ) : (
                                <User className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm">{agent.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {agent.agentId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{agent.modelName || agent.modelId}</div>
                          {agent.serverName && (
                            <div className="text-sm text-muted-foreground">{agent.serverName}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {agent.description ? (
                            <div className="text-sm truncate">{agent.description}</div>
                          ) : (
                            <div className="text-sm text-muted-foreground">{lang('noDescription')}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {agent.supportsWebSearch && (
                            <Badge variant="outline" className="text-xs">
                              Web Search
                            </Badge>
                          )}
                          {!agent.supportsWebSearch && (
                            <span className="text-xs text-muted-foreground">없음</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={agent.supportsDeepResearch ?? true}
                            onCheckedChange={() => handleToggleDeepResearch(agent.id, agent.supportsDeepResearch ?? true)}
                            disabled={isLoading}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={agent.compressImage ?? true}
                            onCheckedChange={() => handleToggleImageCompression(agent.id, agent.compressImage ?? true)}
                            disabled={isLoading}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={agent.enabled}
                            onCheckedChange={() => handleToggleAgent(agent.id, agent.enabled)}
                            disabled={isLoading}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/agent/register?id=${agent.id}`)}
                            disabled={isLoading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={isLoading}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{lang('deleteConfirm')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {lang('deleteConfirmMessage')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{lang('cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteAgent(agent.id, agent.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {lang('delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {agents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {lang('noAgents')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  )
} 