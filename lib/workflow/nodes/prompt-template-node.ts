import { BaseNode, ExecutionContext } from './index'
import { NodeType, WorkflowNode } from '../types'

export class PromptTemplateNode extends BaseNode {
  constructor(node: WorkflowNode) {
    super(node)
  }

  async execute(input: any, context: ExecutionContext): Promise<any> {
    try {
      this.validateInput(input)

      const { template, variables = [] } = this.config
      
      // Prepare variable values
      let variableValues: Record<string, any> = {}
      
      if (typeof input === 'object' && !Array.isArray(input)) {
        variableValues = input
      } else {
        // If input is not an object, use it as the first variable
        if (variables.length > 0) {
          variableValues[variables[0]] = input
        }
      }

      // Replace variables in template
      let result = template
      for (const variable of variables) {
        const value = variableValues[variable] ?? context.variables[variable] ?? ''
        const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g')
        result = result.replace(regex, String(value))
      }

      return result
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  validateInput(input: any): void {
    if (!this.config.template) {
      throw new Error('Template is required in node configuration')
    }
  }
}
