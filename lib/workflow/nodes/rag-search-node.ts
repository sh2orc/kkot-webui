import { BaseNode, ExecutionContext } from './index'
import { NodeType, WorkflowNode } from '../types'
import { searchDocuments } from '@/lib/rag'

export class RAGSearchNode extends BaseNode {
  constructor(node: WorkflowNode) {
    super(node)
  }

  async execute(input: any, context: ExecutionContext): Promise<any> {
    try {
      this.validateInput(input)

      const { collectionId, topK = 5, similarityThreshold = 0.7 } = this.config
      
      // Extract query from input
      const query = typeof input === 'string' ? input : input.query || JSON.stringify(input)

      // Search documents
      const searchResults = await searchDocuments({
        collectionId,
        query,
        topK,
        similarityThreshold
      })

      // Format results
      const formattedResults = searchResults.map(result => ({
        content: result.content,
        metadata: result.metadata,
        similarity: result.similarity,
        documentId: result.documentId
      }))

      return {
        query,
        results: formattedResults,
        count: formattedResults.length
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  validateInput(input: any): void {
    if (!input) {
      throw new Error('Input is required for RAG Search node')
    }
    if (!this.config.collectionId) {
      throw new Error('Collection ID is required in node configuration')
    }
  }
}
