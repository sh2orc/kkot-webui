import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { workflowDefinitions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// GET: List all workflows for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workflows = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.createdBy, session.user.id))
      .orderBy(workflowDefinitions.updatedAt)

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    )
  }
}

// POST: Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, nodes, edges } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      )
    }

    const workflowId = `workflow_${uuidv4()}`
    
    const workflowData = {
      nodes: nodes || [],
      edges: edges || [],
      variables: []
    }

    const [workflow] = await db
      .insert(workflowDefinitions)
      .values({
        workflowId,
        name,
        description,
        version: 1,
        isPublished: false,
        createdBy: session.user.id,
        config: workflowData
      })
      .returning()

    return NextResponse.json({ workflow })
  } catch (error) {
    console.error('Error creating workflow:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}

// PUT: Update an existing workflow
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, name, description, nodes, edges, isPublished } = body

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      )
    }

    // Check if workflow exists and belongs to user
    const existing = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.workflowId, workflowId))
      .limit(1)

    if (!existing.length || existing[0].createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Workflow not found or unauthorized' },
        { status: 404 }
      )
    }

    const workflowData = {
      nodes: nodes || existing[0].config?.nodes || [],
      edges: edges || existing[0].config?.edges || [],
      variables: existing[0].config?.variables || []
    }

    const [updated] = await db
      .update(workflowDefinitions)
      .set({
        name: name || existing[0].name,
        description: description !== undefined ? description : existing[0].description,
        isPublished: isPublished !== undefined ? isPublished : existing[0].isPublished,
        config: workflowData,
        updatedAt: new Date()
      })
      .where(eq(workflowDefinitions.workflowId, workflowId))
      .returning()

    return NextResponse.json({ workflow: updated })
  } catch (error) {
    console.error('Error updating workflow:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    )
  }
}
