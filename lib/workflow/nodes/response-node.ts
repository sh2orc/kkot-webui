import { BaseNode, ExecutionContext } from './index'
import { NodeType, WorkflowNode } from '../types'

export class ResponseNode extends BaseNode {
  constructor(node: WorkflowNode) {
    super(node)
  }

  async execute(input: any, context: ExecutionContext): Promise<any> {
    try {
      const { format = 'json', template } = this.config
      
      let response: any
      
      switch (format) {
        case 'json':
          response = input
          break
          
        case 'text':
          response = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
          break
          
        case 'template':
          if (template) {
            response = this.applyTemplate(template, input, context)
          } else {
            response = input
          }
          break
          
        case 'markdown':
          response = this.formatAsMarkdown(input)
          break
          
        default:
          response = input
      }
      
      return {
        format,
        content: response,
        metadata: {
          executionId: context.executionId,
          timestamp: new Date().toISOString(),
          userId: context.userId
        }
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private applyTemplate(template: string, data: any, context: ExecutionContext): string {
    let result = template
    
    // Replace data placeholders
    const dataRegex = /{{data\.(\w+)}}/g
    result = result.replace(dataRegex, (match, key) => {
      return data[key] ?? match
    })
    
    // Replace context placeholders
    const contextRegex = /{{context\.(\w+)}}/g
    result = result.replace(contextRegex, (match, key) => {
      return context[key as keyof ExecutionContext] ?? match
    })
    
    return result
  }

  private formatAsMarkdown(input: any): string {
    if (typeof input === 'string') {
      return input
    }
    
    if (Array.isArray(input)) {
      return input.map((item, index) => `${index + 1}. ${JSON.stringify(item)}`).join('\n')
    }
    
    if (typeof input === 'object') {
      const lines: string[] = []
      for (const [key, value] of Object.entries(input)) {
        lines.push(`**${key}**: ${JSON.stringify(value)}`)
      }
      return lines.join('\n\n')
    }
    
    return String(input)
  }

  validateInput(input: any): void {
    // Response node accepts any input
  }
}
