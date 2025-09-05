"use client"

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import {
  FileText,
  Bot,
  Search,
  Globe,
  Code,
  GitBranch,
  Repeat,
  Zap,
  Database,
  Send,
  Upload,
  Download,
  LucideIcon
} from 'lucide-react'
import { NodeType } from '@/lib/workflow/types'

const nodeIcons: Record<NodeType, LucideIcon> = {
  [NodeType.USER_INPUT]: FileText,
  [NodeType.FILE_UPLOAD]: Upload,
  [NodeType.API_TRIGGER]: Zap,
  [NodeType.WEBHOOK_RECEIVER]: Download,
  [NodeType.LLM_AGENT]: Bot,
  [NodeType.RAG_SEARCH]: Search,
  [NodeType.DEEP_RESEARCH]: Globe,
  [NodeType.WEB_SEARCH]: Globe,
  [NodeType.TEXT_PROCESSOR]: FileText,
  [NodeType.JSON_PARSER]: Code,
  [NodeType.PROMPT_TEMPLATE]: FileText,
  [NodeType.DATA_MAPPER]: Code,
  [NodeType.CONDITIONAL]: GitBranch,
  [NodeType.LOOP]: Repeat,
  [NodeType.PARALLEL]: Zap,
  [NodeType.SEQUENTIAL]: Zap,
  [NodeType.WAIT]: Zap,
  [NodeType.HTTP_REQUEST]: Globe,
  [NodeType.DATABASE_QUERY]: Database,
  [NodeType.RESPONSE]: Send,
  [NodeType.WEBHOOK_SENDER]: Download,
  [NodeType.EMAIL_SENDER]: Send,
  [NodeType.NOTIFICATION]: Send,
}

const nodeColors: Record<NodeType, string> = {
  // Input nodes - blue
  [NodeType.USER_INPUT]: 'border-blue-500 bg-blue-50',
  [NodeType.FILE_UPLOAD]: 'border-blue-500 bg-blue-50',
  [NodeType.API_TRIGGER]: 'border-blue-500 bg-blue-50',
  [NodeType.WEBHOOK_RECEIVER]: 'border-blue-500 bg-blue-50',
  
  // AI nodes - purple
  [NodeType.LLM_AGENT]: 'border-purple-500 bg-purple-50',
  [NodeType.RAG_SEARCH]: 'border-purple-500 bg-purple-50',
  [NodeType.DEEP_RESEARCH]: 'border-purple-500 bg-purple-50',
  [NodeType.WEB_SEARCH]: 'border-purple-500 bg-purple-50',
  
  // Transform nodes - green
  [NodeType.TEXT_PROCESSOR]: 'border-green-500 bg-green-50',
  [NodeType.JSON_PARSER]: 'border-green-500 bg-green-50',
  [NodeType.PROMPT_TEMPLATE]: 'border-green-500 bg-green-50',
  [NodeType.DATA_MAPPER]: 'border-green-500 bg-green-50',
  
  // Control nodes - orange
  [NodeType.CONDITIONAL]: 'border-orange-500 bg-orange-50',
  [NodeType.LOOP]: 'border-orange-500 bg-orange-50',
  [NodeType.PARALLEL]: 'border-orange-500 bg-orange-50',
  [NodeType.SEQUENTIAL]: 'border-orange-500 bg-orange-50',
  [NodeType.WAIT]: 'border-orange-500 bg-orange-50',
  
  // Integration nodes - cyan
  [NodeType.HTTP_REQUEST]: 'border-cyan-500 bg-cyan-50',
  [NodeType.DATABASE_QUERY]: 'border-cyan-500 bg-cyan-50',
  
  // Output nodes - red
  [NodeType.RESPONSE]: 'border-red-500 bg-red-50',
  [NodeType.WEBHOOK_SENDER]: 'border-red-500 bg-red-50',
  [NodeType.EMAIL_SENDER]: 'border-red-500 bg-red-50',
  [NodeType.NOTIFICATION]: 'border-red-500 bg-red-50',
}

function CustomNode({ data, isConnectable, selected }: NodeProps) {
  const Icon = nodeIcons[data.type as NodeType] || FileText
  const colorClass = nodeColors[data.type as NodeType] || 'border-gray-500 bg-gray-50'

  return (
    <Card className={`min-w-[180px] border-2 ${colorClass} ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3"
      />
      
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="font-medium text-sm">{data.label}</span>
        </div>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3"
      />
    </Card>
  )
}

export default memo(CustomNode)
