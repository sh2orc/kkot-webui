import { NodeType, WorkflowNode, NodeConfig } from '../types'

// Base node class
export abstract class BaseNode {
  id: string
  type: NodeType
  config: any

  constructor(node: WorkflowNode) {
    this.id = node.id
    this.type = node.type
    this.config = node.data.config
  }

  abstract async execute(input: any, context: ExecutionContext): Promise<any>
  
  validateInput(input: any): void {
    // Base validation logic
  }
  
  handleError(error: Error): void {
    console.error(`Error in node ${this.id}:`, error)
    throw error
  }
}

// Execution context for passing data between nodes
export interface ExecutionContext {
  executionId: string
  variables: Record<string, any>
  services: {
    llmService?: any
    ragService?: any
    webSearchService?: any
    // Add more services as needed
  }
  userId?: string
}

// Node implementations
export { LLMAgentNode } from './llm-agent-node'
export { RAGSearchNode } from './rag-search-node'
export { PromptTemplateNode } from './prompt-template-node'
export { ConditionalNode } from './conditional-node'
export { HTTPRequestNode } from './http-request-node'
export { UserInputNode } from './user-input-node'
export { ResponseNode } from './response-node'

// Node factory
export class NodeFactory {
  static createNode(workflowNode: WorkflowNode): BaseNode {
    switch (workflowNode.type) {
      case NodeType.LLM_AGENT:
        return new (require('./llm-agent-node').LLMAgentNode)(workflowNode)
      case NodeType.RAG_SEARCH:
        return new (require('./rag-search-node').RAGSearchNode)(workflowNode)
      case NodeType.PROMPT_TEMPLATE:
        return new (require('./prompt-template-node').PromptTemplateNode)(workflowNode)
      case NodeType.CONDITIONAL:
        return new (require('./conditional-node').ConditionalNode)(workflowNode)
      case NodeType.HTTP_REQUEST:
        return new (require('./http-request-node').HTTPRequestNode)(workflowNode)
      case NodeType.USER_INPUT:
        return new (require('./user-input-node').UserInputNode)(workflowNode)
      case NodeType.RESPONSE:
        return new (require('./response-node').ResponseNode)(workflowNode)
      default:
        throw new Error(`Unknown node type: ${workflowNode.type}`)
    }
  }
}

// Node registry for dynamic node types
export class NodeRegistry {
  private static nodes: Map<NodeType, typeof BaseNode> = new Map()

  static register(type: NodeType, nodeClass: typeof BaseNode) {
    this.nodes.set(type, nodeClass)
  }

  static get(type: NodeType): typeof BaseNode | undefined {
    return this.nodes.get(type)
  }

  static getAll(): Map<NodeType, typeof BaseNode> {
    return this.nodes
  }
}
