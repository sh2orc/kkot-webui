import { BaseNode, ExecutionContext } from './index'
import { NodeType, WorkflowNode } from '../types'

export class HTTPRequestNode extends BaseNode {
  constructor(node: WorkflowNode) {
    super(node)
  }

  async execute(input: any, context: ExecutionContext): Promise<any> {
    try {
      this.validateInput(input)

      const { url, method = 'GET', headers = {}, timeout = 30000 } = this.config
      
      // Replace variables in URL
      const processedUrl = this.processTemplate(url, input, context)
      
      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
      
      // Add body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        if (input) {
          requestOptions.body = JSON.stringify(input)
        }
      }
      
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      requestOptions.signal = controller.signal
      
      try {
        // Make the request
        const response = await fetch(processedUrl, requestOptions)
        clearTimeout(timeoutId)
        
        // Parse response
        const contentType = response.headers.get('content-type')
        let data: any
        
        if (contentType?.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data,
          success: response.ok
        }
      } catch (error: any) {
        clearTimeout(timeoutId)
        
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`)
        }
        throw error
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private processTemplate(template: string, input: any, context: ExecutionContext): string {
    let result = template
    
    // Replace input variables {{input.field}}
    if (typeof input === 'object' && !Array.isArray(input)) {
      for (const [key, value] of Object.entries(input)) {
        const regex = new RegExp(`{{input\\.${key}}}`, 'g')
        result = result.replace(regex, String(value))
      }
    }
    
    // Replace context variables {{context.field}}
    for (const [key, value] of Object.entries(context.variables)) {
      const regex = new RegExp(`{{context\\.${key}}}`, 'g')
      result = result.replace(regex, String(value))
    }
    
    return result
  }

  validateInput(input: any): void {
    if (!this.config.url) {
      throw new Error('URL is required in node configuration')
    }
    
    const method = this.config.method?.toUpperCase() || 'GET'
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
      throw new Error(`Invalid HTTP method: ${method}`)
    }
  }
}
