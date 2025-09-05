import { BaseNode, ExecutionContext } from './index'
import { NodeType, WorkflowNode } from '../types'

export class UserInputNode extends BaseNode {
  constructor(node: WorkflowNode) {
    super(node)
  }

  async execute(input: any, context: ExecutionContext): Promise<any> {
    try {
      // User input node simply passes through the initial input
      // In a real implementation, this might prompt for user input
      const { inputType = 'text', defaultValue, validation } = this.config
      
      // Use provided input or default value
      const value = input ?? defaultValue ?? ''
      
      // Simple validation if configured
      if (validation) {
        if (validation.required && !value) {
          throw new Error('Input is required')
        }
        if (validation.minLength && value.length < validation.minLength) {
          throw new Error(`Input must be at least ${validation.minLength} characters`)
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          throw new Error(`Input must be no more than ${validation.maxLength} characters`)
        }
      }
      
      return {
        type: inputType,
        value,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  validateInput(input: any): void {
    // User input node doesn't require input validation
    // as it's the starting point
  }
}
