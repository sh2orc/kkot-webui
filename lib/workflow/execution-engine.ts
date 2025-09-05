import { WorkflowDefinition, WorkflowNode, WorkflowEdge, ExecutionStatus } from './types'
import { NodeFactory, ExecutionContext } from './nodes'
import { v4 as uuidv4 } from 'uuid'

export class WorkflowExecutionEngine {
  private workflow: WorkflowDefinition
  private executionId: string
  private nodeResults: Map<string, any> = new Map()
  private status: ExecutionStatus = ExecutionStatus.PENDING

  constructor(workflow: WorkflowDefinition) {
    this.workflow = workflow
    this.executionId = uuidv4()
  }

  async execute(input: any, userId?: string): Promise<any> {
    try {
      this.status = ExecutionStatus.RUNNING
      
      // Create execution context
      const context: ExecutionContext = {
        executionId: this.executionId,
        variables: {},
        services: {
          // Initialize services here
        },
        userId
      }

      // Find start nodes (nodes with no incoming edges)
      const startNodes = this.findStartNodes()
      
      // Execute workflow starting from start nodes
      const results = await this.executeNodes(startNodes, input, context)
      
      this.status = ExecutionStatus.COMPLETED
      return results
    } catch (error) {
      this.status = ExecutionStatus.FAILED
      throw error
    }
  }

  private findStartNodes(): WorkflowNode[] {
    const nodesWithIncomingEdges = new Set(
      this.workflow.edges.map(edge => edge.target)
    )
    
    return this.workflow.nodes.filter(
      node => !nodesWithIncomingEdges.has(node.id)
    )
  }

  private async executeNodes(
    nodes: WorkflowNode[], 
    input: any, 
    context: ExecutionContext
  ): Promise<any> {
    const results: any[] = []

    for (const node of nodes) {
      const result = await this.executeNode(node, input, context)
      results.push(result)
    }

    return results.length === 1 ? results[0] : results
  }

  private async executeNode(
    node: WorkflowNode, 
    input: any, 
    context: ExecutionContext
  ): Promise<any> {
    try {
      // Check if node has already been executed
      if (this.nodeResults.has(node.id)) {
        return this.nodeResults.get(node.id)
      }

      // Get inputs from connected nodes
      const nodeInput = await this.prepareNodeInput(node, input, context)
      
      // Create and execute node
      const nodeInstance = NodeFactory.createNode(node)
      const result = await nodeInstance.execute(nodeInput, context)
      
      // Store result
      this.nodeResults.set(node.id, result)
      
      // Execute downstream nodes
      const downstreamNodes = this.findDownstreamNodes(node.id)
      if (downstreamNodes.length > 0) {
        await this.executeNodes(downstreamNodes, result, context)
      }
      
      return result
    } catch (error) {
      console.error(`Error executing node ${node.id}:`, error)
      throw error
    }
  }

  private async prepareNodeInput(
    node: WorkflowNode, 
    defaultInput: any, 
    context: ExecutionContext
  ): Promise<any> {
    // Get incoming edges
    const incomingEdges = this.workflow.edges.filter(
      edge => edge.target === node.id
    )

    if (incomingEdges.length === 0) {
      return defaultInput
    }

    // Collect inputs from connected nodes
    const inputs: any[] = []
    for (const edge of incomingEdges) {
      const sourceResult = this.nodeResults.get(edge.source)
      if (sourceResult !== undefined) {
        inputs.push(sourceResult)
      }
    }

    // Return single input or array of inputs
    return inputs.length === 1 ? inputs[0] : inputs
  }

  private findDownstreamNodes(nodeId: string): WorkflowNode[] {
    const downstreamEdges = this.workflow.edges.filter(
      edge => edge.source === nodeId
    )
    
    const downstreamNodeIds = downstreamEdges.map(edge => edge.target)
    
    return this.workflow.nodes.filter(
      node => downstreamNodeIds.includes(node.id)
    )
  }

  getStatus(): ExecutionStatus {
    return this.status
  }

  getExecutionId(): string {
    return this.executionId
  }

  getNodeResults(): Map<string, any> {
    return this.nodeResults
  }
}

// Execution manager for handling multiple executions
export class WorkflowExecutionManager {
  private executions: Map<string, WorkflowExecutionEngine> = new Map()

  async executeWorkflow(
    workflow: WorkflowDefinition, 
    input: any, 
    userId?: string
  ): Promise<{ executionId: string; result: any }> {
    const engine = new WorkflowExecutionEngine(workflow)
    this.executions.set(engine.getExecutionId(), engine)
    
    const result = await engine.execute(input, userId)
    
    return {
      executionId: engine.getExecutionId(),
      result
    }
  }

  getExecution(executionId: string): WorkflowExecutionEngine | undefined {
    return this.executions.get(executionId)
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId)
    if (execution) {
      // Implement cancellation logic
      return true
    }
    return false
  }
}
