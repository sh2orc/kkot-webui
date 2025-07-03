import { NextRequest, NextResponse } from 'next/server'
import { agentManageRepository } from '@/lib/db/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agents = await agentManageRepository.findAllWithModelAndServer()
    const agent = agents.find((a: any) => a.id === id)
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }
    
    // Convert Uint8Array to Base64 string
    if (agent.imageData instanceof Uint8Array) {
      agent.imageData = Buffer.from(agent.imageData).toString()
    }
    
    return NextResponse.json(agent)
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    )
  }
}

// PUT - Update agent by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Build update data
    const updateData: any = {};
    if (body.modelId !== undefined) updateData.modelId = body.modelId;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.topK !== undefined) updateData.topK = body.topK;
    if (body.topP !== undefined) updateData.topP = body.topP;
    if (body.maxTokens !== undefined) updateData.maxTokens = body.maxTokens;
    if (body.presencePenalty !== undefined) updateData.presencePenalty = body.presencePenalty;
    if (body.frequencyPenalty !== undefined) updateData.frequencyPenalty = body.frequencyPenalty;
    if (body.imageData !== undefined) updateData.imageData = body.imageData;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    
    await agentManageRepository.update(params.id, updateData);
    
    // Fetch the updated agent with model and server info
    const agents = await agentManageRepository.findAllWithModelAndServer();
    const updatedAgent = agents.find((a: any) => a.id === params.id);
    
    // Convert Uint8Array to Base64 string
    if (updatedAgent && updatedAgent.imageData instanceof Uint8Array) {
      updatedAgent.imageData = Buffer.from(updatedAgent.imageData).toString('base64');
    }
    
    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { error: '에이전트 정보를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE - Delete agent by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await agentManageRepository.delete(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      { error: '에이전트를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 