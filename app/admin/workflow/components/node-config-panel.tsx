"use client"

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { X } from 'lucide-react'
import { NodeType } from '@/lib/workflow/types'
import { useQuery } from '@tanstack/react-query'

interface NodeConfigPanelProps {
  node: Node
  onUpdate: (config: any) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState(node.data.config || {})
  
  // Fetch available agents for LLM_AGENT node
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents')
      if (!response.ok) throw new Error('Failed to fetch agents')
      return response.json()
    },
    enabled: node.data.type === NodeType.LLM_AGENT
  })

  // Fetch available collections for RAG_SEARCH node
  const { data: collections } = useQuery({
    queryKey: ['rag-collections'],
    queryFn: async () => {
      const response = await fetch('/api/rag/collections')
      if (!response.ok) throw new Error('Failed to fetch collections')
      return response.json()
    },
    enabled: node.data.type === NodeType.RAG_SEARCH
  })

  useEffect(() => {
    setConfig(node.data.config || {})
  }, [node])

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    onUpdate(newConfig)
  }

  const renderConfigFields = () => {
    switch (node.data.type) {
      case NodeType.LLM_AGENT:
        return (
          <>
            <div className="space-y-2">
              <Label>에이전트 선택</Label>
              <Select
                value={config.agentId}
                onValueChange={(value) => handleConfigChange('agentId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="에이전트를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.agents?.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.agentId}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>시스템 프롬프트 (선택사항)</Label>
              <Textarea
                value={config.systemPrompt || ''}
                onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                placeholder="커스텀 시스템 프롬프트를 입력하세요"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Temperature: {config.temperature || 0.7}</Label>
              <Slider
                value={[config.temperature || 0.7]}
                onValueChange={([value]) => handleConfigChange('temperature', value)}
                min={0}
                max={1}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>최대 토큰</Label>
              <Input
                type="number"
                value={config.maxTokens || 2048}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                min={1}
                max={4096}
              />
            </div>
          </>
        )

      case NodeType.RAG_SEARCH:
        return (
          <>
            <div className="space-y-2">
              <Label>컬렉션 선택</Label>
              <Select
                value={config.collectionId}
                onValueChange={(value) => handleConfigChange('collectionId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="컬렉션을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {collections?.map((collection: any) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>검색 결과 수 (Top K)</Label>
              <Input
                type="number"
                value={config.topK || 5}
                onChange={(e) => handleConfigChange('topK', parseInt(e.target.value))}
                min={1}
                max={20}
              />
            </div>

            <div className="space-y-2">
              <Label>유사도 임계값: {config.similarityThreshold || 0.7}</Label>
              <Slider
                value={[config.similarityThreshold || 0.7]}
                onValueChange={([value]) => handleConfigChange('similarityThreshold', value)}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </>
        )

      case NodeType.PROMPT_TEMPLATE:
        return (
          <>
            <div className="space-y-2">
              <Label>프롬프트 템플릿</Label>
              <Textarea
                value={config.template || ''}
                onChange={(e) => handleConfigChange('template', e.target.value)}
                placeholder="변수는 {{variable}} 형식으로 사용하세요"
                rows={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label>변수 목록 (쉼표로 구분)</Label>
              <Input
                value={config.variables?.join(', ') || ''}
                onChange={(e) => handleConfigChange('variables', e.target.value.split(',').map(v => v.trim()))}
                placeholder="name, age, topic"
              />
            </div>
          </>
        )

      case NodeType.CONDITIONAL:
        return (
          <>
            <div className="space-y-2">
              <Label>조건 필드</Label>
              <Input
                value={config.field || ''}
                onChange={(e) => handleConfigChange('field', e.target.value)}
                placeholder="status"
              />
            </div>

            <div className="space-y-2">
              <Label>연산자</Label>
              <Select
                value={config.operator}
                onValueChange={(value) => handleConfigChange('operator', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="연산자 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">같음 (=)</SelectItem>
                  <SelectItem value="not_equals">같지 않음 (≠)</SelectItem>
                  <SelectItem value="greater_than">큼 (>)</SelectItem>
                  <SelectItem value="less_than">작음 (<)</SelectItem>
                  <SelectItem value="contains">포함</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>비교값</Label>
              <Input
                value={config.value || ''}
                onChange={(e) => handleConfigChange('value', e.target.value)}
                placeholder="success"
              />
            </div>
          </>
        )

      case NodeType.HTTP_REQUEST:
        return (
          <>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>

            <div className="space-y-2">
              <Label>메소드</Label>
              <Select
                value={config.method || 'GET'}
                onValueChange={(value) => handleConfigChange('method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>헤더 (JSON)</Label>
              <Textarea
                value={JSON.stringify(config.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value)
                    handleConfigChange('headers', headers)
                  } catch {}
                }}
                placeholder='{"Authorization": "Bearer token"}'
                rows={3}
              />
            </div>
          </>
        )

      default:
        return (
          <p className="text-sm text-muted-foreground">
            이 노드 타입에 대한 설정이 없습니다.
          </p>
        )
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">노드 설정</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>노드 ID</Label>
          <Input value={node.id} disabled />
        </div>

        <div className="space-y-2">
          <Label>노드 타입</Label>
          <Input value={node.data.label} disabled />
        </div>

        {renderConfigFields()}
      </CardContent>
    </Card>
  )
}
