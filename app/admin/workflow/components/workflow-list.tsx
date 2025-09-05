"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  Edit, 
  Copy, 
  Trash, 
  MoreVertical,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { WorkflowDefinition, ExecutionStatus } from '@/lib/workflow/types'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface WorkflowListProps {
  onSelectWorkflow: (workflow: WorkflowDefinition) => void
}

// Mock data - 실제로는 API에서 가져옴
const mockWorkflows: WorkflowDefinition[] = [
  {
    id: '1',
    workflowId: 'workflow_1',
    name: 'AI 블로그 포스트 생성',
    description: 'RAG 검색과 LLM을 활용한 자동 블로그 포스트 생성',
    version: 1,
    isPublished: true,
    nodes: [],
    edges: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    workflowId: 'workflow_2',
    name: '고객 문의 자동 응답',
    description: '고객 문의를 분석하고 적절한 응답 생성',
    version: 2,
    isPublished: false,
    nodes: [],
    edges: [],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
  },
]

const statusIcons = {
  [ExecutionStatus.COMPLETED]: <CheckCircle className="h-4 w-4 text-green-500" />,
  [ExecutionStatus.FAILED]: <XCircle className="h-4 w-4 text-red-500" />,
  [ExecutionStatus.RUNNING]: <Clock className="h-4 w-4 text-blue-500 animate-spin" />,
  [ExecutionStatus.PENDING]: <Clock className="h-4 w-4 text-gray-500" />,
}

export default function WorkflowList({ onSelectWorkflow }: WorkflowListProps) {
  const [workflows] = useState<WorkflowDefinition[]>(mockWorkflows)

  const handleAction = (action: string, workflow: WorkflowDefinition) => {
    switch (action) {
      case 'edit':
        onSelectWorkflow(workflow)
        break
      case 'duplicate':
        // Implement duplicate logic
        console.log('Duplicate workflow:', workflow.id)
        break
      case 'delete':
        // Implement delete logic
        console.log('Delete workflow:', workflow.id)
        break
      case 'run':
        // Implement run logic
        console.log('Run workflow:', workflow.id)
        break
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {workflow.description}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAction('edit', workflow)}>
                      <Edit className="h-4 w-4 mr-2" />
                      편집
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('duplicate', workflow)}>
                      <Copy className="h-4 w-4 mr-2" />
                      복제
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleAction('delete', workflow)}
                      className="text-destructive"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={workflow.isPublished ? "default" : "secondary"}>
                    {workflow.isPublished ? "게시됨" : "초안"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    v{workflow.version}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(workflow.updatedAt, { 
                      addSuffix: true, 
                      locale: ko 
                    })} 수정됨
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleAction('run', workflow)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    실행
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleAction('edit', workflow)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    편집
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle>최근 실행 내역</CardTitle>
          <CardDescription>워크플로우 실행 기록</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {[
                { name: 'AI 블로그 포스트 생성', status: ExecutionStatus.COMPLETED, time: '5분 전' },
                { name: '고객 문의 자동 응답', status: ExecutionStatus.RUNNING, time: '10분 전' },
                { name: 'AI 블로그 포스트 생성', status: ExecutionStatus.FAILED, time: '1시간 전' },
              ].map((execution, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                  <div className="flex items-center gap-2">
                    {statusIcons[execution.status]}
                    <span className="text-sm font-medium">{execution.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{execution.time}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
