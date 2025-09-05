import { BaseNode, ExecutionContext } from './index'
import { NodeType, WorkflowNode } from '../types'
import { getAgentById } from '@/lib/db/repository/agent'
import { generateChatCompletion } from '@/lib/llm'

export class LLMAgentNode extends BaseNode {
  constructor(node: WorkflowNode) {
    super(node)
  }

  async execute(input: any, context: ExecutionContext): Promise<any> {
    try {
      this.validateInput(input)

      const { agentId, systemPrompt, temperature, maxTokens } = this.config
      
      // Get agent configuration
      const agent = await getAgentById(agentId)
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`)
      }

      // Prepare messages
      const messages = []
      
      // Add system prompt
      const finalSystemPrompt = systemPrompt || agent.systemPrompt
      if (finalSystemPrompt) {
        messages.push({ role: 'system', content: finalSystemPrompt })
      }

      // Add user input
      const userMessage = typeof input === 'string' ? input : JSON.stringify(input)
      messages.push({ role: 'user', content: userMessage })

      // Generate completion
      const response = await generateChatCompletion({
        model: agent.modelId,
        messages,
        temperature: temperature ?? agent.temperature,
        maxTokens: maxTokens ?? agent.maxTokens,
        userId: context.userId
      })

      return {
        content: response.content,
        model: agent.modelId,
        usage: response.usage
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  validateInput(input: any): void {
    if (!input) {
      throw new Error('Input is required for LLM Agent node')
    }
    if (!this.config.agentId) {
      throw new Error('Agent ID is required in node configuration')
    }
  }
}
