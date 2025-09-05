import { BaseNode, ExecutionContext } from './index'
import { NodeType, WorkflowNode, ConditionOperator } from '../types'

export class ConditionalNode extends BaseNode {
  constructor(node: WorkflowNode) {
    super(node)
  }

  async execute(input: any, context: ExecutionContext): Promise<any> {
    try {
      const { field, operator, value } = this.config
      
      // Extract field value from input
      const fieldValue = this.getFieldValue(input, field)
      
      // Evaluate condition
      const conditionMet = this.evaluateCondition(fieldValue, operator, value)
      
      // Return result with condition outcome
      return {
        input,
        conditionMet,
        field,
        fieldValue,
        expectedValue: value,
        outputPort: conditionMet ? 'true' : 'false'
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private getFieldValue(input: any, field: string): any {
    if (!field) return input
    
    // Support nested field access (e.g., "user.name")
    const fields = field.split('.')
    let value = input
    
    for (const f of fields) {
      if (value && typeof value === 'object') {
        value = value[f]
      } else {
        return undefined
      }
    }
    
    return value
  }

  private evaluateCondition(fieldValue: any, operator: ConditionOperator, expectedValue: any): boolean {
    switch (operator) {
      case ConditionOperator.EQUALS:
        return fieldValue == expectedValue
      
      case ConditionOperator.NOT_EQUALS:
        return fieldValue != expectedValue
      
      case ConditionOperator.GREATER_THAN:
        return Number(fieldValue) > Number(expectedValue)
      
      case ConditionOperator.LESS_THAN:
        return Number(fieldValue) < Number(expectedValue)
      
      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(expectedValue))
      
      case ConditionOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(expectedValue))
      
      case ConditionOperator.IS_EMPTY:
        return !fieldValue || 
               (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
               (Array.isArray(fieldValue) && fieldValue.length === 0) ||
               (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0)
      
      case ConditionOperator.IS_NOT_EMPTY:
        return fieldValue && 
               !(typeof fieldValue === 'string' && fieldValue.trim() === '') &&
               !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
               !(typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0)
      
      default:
        throw new Error(`Unknown operator: ${operator}`)
    }
  }

  validateInput(input: any): void {
    if (!this.config.operator) {
      throw new Error('Operator is required in node configuration')
    }
  }
}
