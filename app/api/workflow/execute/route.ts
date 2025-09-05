import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { workflowDefinitions, workflowExecutions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { WorkflowExecutionEngine } from '@/lib/workflow/execution-engine'
import { WorkflowDefinition, ExecutionStatus } from '@/lib/workflow/types'

// POST: Execute a workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, input } = body

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      )
    }

    // Fetch workflow definition
    const [workflowRecord] = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.workflowId, workflowId))
      .limit(1)

    if (!workflowRecord) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!workflowRecord.isPublished && workflowRecord.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to execute this workflow' },
        { status: 403 }
      )
    }

    // Create execution record
    const executionId = uuidv4()
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        executionId,
        workflowId,
        status: ExecutionStatus.PENDING,
        inputData: input,
        userId: session.user.id
      })
      .returning()

    // Prepare workflow definition
    const workflow: WorkflowDefinition = {
      id: workflowRecord.id.toString(),
      workflowId: workflowRecord.workflowId,
      name: workflowRecord.name,
      description: workflowRecord.description,
      version: workflowRecord.version,
      isPublished: workflowRecord.isPublished,
      nodes: workflowRecord.config?.nodes || [],
      edges: workflowRecord.config?.edges || [],
      variables: workflowRecord.config?.variables,
      createdAt: workflowRecord.createdAt,
      updatedAt: workflowRecord.updatedAt
    }

    // Execute workflow asynchronously
    executeWorkflowAsync(workflow, input, executionId, session.user.id)

    return NextResponse.json({
      executionId,
      status: ExecutionStatus.PENDING,
      message: 'Workflow execution started'
    })
  } catch (error) {
    console.error('Error executing workflow:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}

// Async workflow execution
async function executeWorkflowAsync(
  workflow: WorkflowDefinition,
  input: any,
  executionId: string,
  userId: string
) {
  try {
    // Update status to running
    await db
      .update(workflowExecutions)
      .set({ 
        status: ExecutionStatus.RUNNING,
        startedAt: new Date()
      })
      .where(eq(workflowExecutions.executionId, executionId))

    // Create and run execution engine
    const engine = new WorkflowExecutionEngine(workflow)
    const result = await engine.execute(input, userId)

    // Update execution with results
    await db
      .update(workflowExecutions)
      .set({
        status: ExecutionStatus.COMPLETED,
        outputData: result,
        completedAt: new Date()
      })
      .where(eq(workflowExecutions.executionId, executionId))

  } catch (error: any) {
    console.error('Workflow execution error:', error)
    
    // Update execution with error
    await db
      .update(workflowExecutions)
      .set({
        status: ExecutionStatus.FAILED,
        errorMessage: error.message || 'Unknown error',
        completedAt: new Date()
      })
      .where(eq(workflowExecutions.executionId, executionId))
  }
}

// GET: Get execution status
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const executionId = searchParams.get('executionId')

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      )
    }

    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.executionId, executionId))
      .limit(1)

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (execution.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this execution' },
        { status: 403 }
      )
    }

    return NextResponse.json({ execution })
  } catch (error) {
    console.error('Error fetching execution:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    )
  }
}
