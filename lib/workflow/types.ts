// Workflow type definitions
export interface WorkflowDefinition {
  id: string
  workflowId: string
  name: string
  description?: string
  version: number
  isPublished: boolean
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables?: WorkflowVariable[]
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowNode {
  id: string
  type: NodeType
  position: Position
  data: NodeData
  inputs?: PortDefinition[]
  outputs?: PortDefinition[]
}

export interface Position {
  x: number
  y: number
}

export interface NodeData {
  label: string
  config: any // Node-specific configuration
  description?: string
}

export interface PortDefinition {
  id: string
  label: string
  type: DataType
  required?: boolean
  multiple?: boolean
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: EdgeType
  data?: EdgeData
}

export interface EdgeData {
  label?: string
  condition?: ConditionRule
}

export interface ConditionRule {
  field: string
  operator: ConditionOperator
  value: any
}

export interface WorkflowVariable {
  name: string
  type: DataType
  defaultValue?: any
  description?: string
}

// Enums
export enum NodeType {
  // Input nodes
  USER_INPUT = 'user_input',
  FILE_UPLOAD = 'file_upload',
  API_TRIGGER = 'api_trigger',
  WEBHOOK_RECEIVER = 'webhook_receiver',
  
  // Processing nodes
  LLM_AGENT = 'llm_agent',
  RAG_SEARCH = 'rag_search',
  DEEP_RESEARCH = 'deep_research',
  WEB_SEARCH = 'web_search',
  
  // Data transformation nodes
  TEXT_PROCESSOR = 'text_processor',
  JSON_PARSER = 'json_parser',
  PROMPT_TEMPLATE = 'prompt_template',
  DATA_MAPPER = 'data_mapper',
  
  // Logic control nodes
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential',
  WAIT = 'wait',
  
  // Integration nodes
  HTTP_REQUEST = 'http_request',
  DATABASE_QUERY = 'database_query',
  
  // Output nodes
  RESPONSE = 'response',
  WEBHOOK_SENDER = 'webhook_sender',
  EMAIL_SENDER = 'email_sender',
  NOTIFICATION = 'notification'
}

export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  FILE = 'file',
  ANY = 'any'
}

export enum EdgeType {
  DEFAULT = 'default',
  CONDITIONAL = 'conditional',
  ERROR = 'error'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty'
}

// Execution types
export interface WorkflowExecution {
  id: string
  executionId: string
  workflowId: string
  status: ExecutionStatus
  inputData?: any
  outputData?: any
  errorMessage?: string
  startedAt: Date
  completedAt?: Date
  userId?: string
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

// Node configurations for each type
export interface NodeConfig {
  [NodeType.LLM_AGENT]: {
    agentId: string
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  }
  [NodeType.RAG_SEARCH]: {
    collectionId: string
    topK?: number
    similarityThreshold?: number
  }
  [NodeType.PROMPT_TEMPLATE]: {
    template: string
    variables: string[]
  }
  [NodeType.CONDITIONAL]: {
    conditions: ConditionRule[]
    defaultOutput?: string
  }
  [NodeType.HTTP_REQUEST]: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
    body?: any
  }
  // Add more node configurations as needed
}
