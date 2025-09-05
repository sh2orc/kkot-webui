"use client"

import { useCallback, useState, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  NodeTypes
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import NodePanel from './node-panel'
import NodeConfigPanel from './node-config-panel'
import CustomNode from './custom-node'
import { WorkflowDefinition, NodeType } from '@/lib/workflow/types'

// Define custom node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

interface WorkflowEditorProps {
  workflow?: WorkflowDefinition | null
  onSave?: (workflow: WorkflowDefinition) => void
}

function WorkflowEditorInner({ workflow, onSave }: WorkflowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || [])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onInit = useCallback((instance: any) => {
    setReactFlowInstance(instance)
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowWrapper.current || !reactFlowInstance) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const type = event.dataTransfer.getData('nodeType') as NodeType

      // Check if the dropped element is valid
      if (!type) return

      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type: 'custom',
        position,
        data: { 
          label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type,
          config: {}
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeConfigUpdate = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
            },
          }
        }
        return node
      })
    )
  }, [setNodes])

  const handleSave = useCallback(() => {
    if (onSave) {
      const workflowData: WorkflowDefinition = {
        id: workflow?.id || '',
        workflowId: workflow?.workflowId || `workflow_${Date.now()}`,
        name: workflow?.name || 'New Workflow',
        description: workflow?.description,
        version: workflow?.version || 1,
        isPublished: workflow?.isPublished || false,
        nodes: nodes as any,
        edges: edges as any,
        createdAt: workflow?.createdAt || new Date(),
        updatedAt: new Date(),
      }
      onSave(workflowData)
    }
  }, [nodes, edges, workflow, onSave])

  return (
    <div className="w-full h-[700px] relative">
      <div className="flex h-full gap-4">
        {/* Node Panel */}
        <div className="w-64 flex-shrink-0">
          <NodePanel />
        </div>

        {/* Flow Editor */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
            
            {/* Top Panel for Actions */}
            <Panel position="top-right">
              <Card className="p-2">
                <Button size="sm" onClick={handleSave}>
                  Save Workflow
                </Button>
              </Card>
            </Panel>
          </ReactFlow>
        </div>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <div className="w-80 flex-shrink-0">
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={(config) => handleNodeConfigUpdate(selectedNode.id, config)}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
