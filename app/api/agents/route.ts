import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { agentManageRepository, llmModelRepository } from '@/lib/db/server'

// GET - Fetch all agents and public models
export async function GET() {
  try {
    // 1. 모든 에이전트 조회 (우선순위 높음)
    const agents = await agentManageRepository.findAllWithModelAndServer()
    
    // 이미지 데이터를 base64로 변환하여 반환
    const processedAgents = agents.map((agent: any) => {
      console.log(`에이전트 ${agent.name} 이미지 데이터 처리:`, {
        hasImageData: !!agent.imageData,
        imageDataType: typeof agent.imageData,
        isUint8Array: agent.imageData instanceof Uint8Array,
        length: agent.imageData?.length
      })
      
      // 이미지 데이터 존재 여부 체크 (더 유연하게)
      const hasImageData = agent.imageData && (
        (agent.imageData instanceof Uint8Array && agent.imageData.length > 0) ||
        (typeof agent.imageData === 'string' && agent.imageData.length > 0)
      );
      
      let imageData = null;
      
      // 이미지가 있는 경우 이미지 데이터를 불러옴
      if (hasImageData) {
        try {
          console.log(`에이전트 ${agent.name} 이미지 변환 시작`)
          
          if (agent.imageData instanceof Uint8Array) {
            // Uint8Array인 경우
            const base64String = Buffer.from(agent.imageData).toString();
            imageData = base64String;
          } else if (typeof agent.imageData === 'string') {
            // 이미 문자열인 경우
            if (agent.imageData.startsWith('data:image/')) {
              // 이미 완전한 data URL인 경우
              imageData = agent.imageData;
            } else {
              // base64 문자열인 경우
              imageData = `data:image/png;base64,${agent.imageData}`;
            }
          }
          
          console.log(`에이전트 ${agent.name} 이미지 변환 완료:`, imageData?.substring(0, 50))
        } catch (error) {
          console.error('이미지 변환 오류:', error);
        }
      } else {
        console.log(`에이전트 ${agent.name}: 이미지 없음`)
      }
      
      return {
        ...agent,
        imageData: imageData, // 변환된 이미지 데이터
        hasImage: !!imageData, // 이미지 존재 여부 플래그
        type: 'agent' // 타입 구분을 위한 필드 추가
      }
    })
    
    console.log("에이전트 목록:", processedAgents.map((a: any) => ({ id: a.id, name: a.name })));
    
    // 2. 공개(isPublic=true) 모델 조회
    const publicModels = await llmModelRepository.findPublic()
    
    // 공개 모델에 대한 capabilities JSON 파싱
    const parsedPublicModels = publicModels.map((model: any) => ({
      ...model,
      capabilities: model.capabilities ? JSON.parse(model.capabilities) : null,
      type: 'model' // 타입 구분을 위한 필드 추가
    }))
    
    // 에이전트와 공개 모델을 합쳐서 반환 (에이전트가 우선)
    return NextResponse.json({
      agents: processedAgents,
      publicModels: parsedPublicModels
    })
  } catch (error) {
    console.error('Failed to fetch agents and public models:', error)
    return NextResponse.json(
      { error: '에이전트와 공개 모델을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - Create new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.modelId || !body.name || !body.agentId) {
      return NextResponse.json(
        { error: 'Model ID, name, and agent ID are required' },
        { status: 400 }
      )
    }

    // Check if agentId is available
    const isAgentIdAvailable = await agentManageRepository.isAgentIdAvailable(body.agentId)
    if (!isAgentIdAvailable) {
      return NextResponse.json(
        { error: 'Agent ID is already in use' },
        { status: 400 }
      )
    }

    // 이미지 처리: base64 문자열을 올바른 형식으로 변환
    let imageData = body.imageData;
    
    if (imageData) {
      console.log('이미지 데이터 처리 시작');
      console.log('원본 이미지 데이터 타입:', typeof imageData);
      console.log('원본 이미지 데이터 길이:', imageData.length);
      
      // 이미지 데이터가 data:image/ 형식으로 시작하면 base64 부분만 추출
      if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
        imageData = imageData.split(',')[1];
        console.log('data URL에서 base64 부분 추출');
      }
      
      // base64 문자열 유효성 검증
      if (typeof imageData === 'string' && imageData.length > 0) {
        try {
          // base64 디코딩 테스트
          const buffer = Buffer.from(imageData, 'base64');
          console.log('base64 디코딩 성공, 크기:', buffer.length, '바이트');
          
          // 이미지 데이터가 너무 작으면 오류
          if (buffer.length < 100) {
            console.error('이미지 데이터가 너무 작음:', buffer.length, '바이트');
            return NextResponse.json(
              { error: '이미지 데이터가 너무 작습니다.' },
              { status: 400 }
            );
          }
          
          // SQLite의 경우 Uint8Array로 저장, PostgreSQL의 경우 문자열로 저장
          // 데이터베이스 스키마에 따라 적절한 형식으로 변환
          imageData = imageData; // base64 문자열 그대로 저장
          
        } catch (error) {
          console.error('base64 디코딩 실패:', error);
          return NextResponse.json(
            { error: '유효하지 않은 이미지 데이터입니다.' },
            { status: 400 }
          );
        }
      } else {
        console.log('이미지 데이터가 없거나 유효하지 않음');
        imageData = null;
      }
    }
    
    const agent = await agentManageRepository.create({
      agentId: body.agentId,
      modelId: body.modelId,
      name: body.name,
      systemPrompt: body.systemPrompt,
      temperature: body.temperature,
      topK: body.topK,
      topP: body.topP,
      maxTokens: body.maxTokens,
      presencePenalty: body.presencePenalty,
      frequencyPenalty: body.frequencyPenalty,
      imageData: imageData, // 처리된 이미지 데이터
      description: body.description,
      enabled: body.enabled,
      parameterEnabled: body.parameterEnabled
    })
    
    // Fetch the created agent with model and server info
    const [createdAgent] = await agentManageRepository.findById(agent[0].id)
    const agents = await agentManageRepository.findAllWithModelAndServer()
    const fullAgent = agents.find((a: any) => a.id === createdAgent.id)
    
    // Uint8Array를 Base64 문자열로 변환
    if (fullAgent && fullAgent.imageData instanceof Uint8Array) {
      fullAgent.imageData = Buffer.from(fullAgent.imageData).toString('base64')
    }
    
    // 페이지 캐시 무효화
    revalidatePath('/admin/agent')
    
    return NextResponse.json(fullAgent)
  } catch (error) {
    console.error('Failed to create agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}

// PUT - Update agent
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }
    
    // Build update data
    const updateData: any = {}
    if (body.agentId !== undefined) {
      // Check if agentId is available (excluding current agent)
      const isAgentIdAvailable = await agentManageRepository.isAgentIdAvailable(body.agentId, body.id)
      if (!isAgentIdAvailable) {
        return NextResponse.json(
          { error: 'Agent ID is already in use' },
          { status: 400 }
        )
      }
      updateData.agentId = body.agentId
    }
    if (body.modelId !== undefined) updateData.modelId = body.modelId
    if (body.name !== undefined) updateData.name = body.name
    if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt
    if (body.temperature !== undefined) updateData.temperature = body.temperature
    if (body.topK !== undefined) updateData.topK = body.topK
    if (body.topP !== undefined) updateData.topP = body.topP
    if (body.maxTokens !== undefined) updateData.maxTokens = body.maxTokens
    if (body.presencePenalty !== undefined) updateData.presencePenalty = body.presencePenalty
    if (body.frequencyPenalty !== undefined) updateData.frequencyPenalty = body.frequencyPenalty
    if (body.description !== undefined) updateData.description = body.description
    if (body.enabled !== undefined) updateData.enabled = body.enabled
    if (body.parameterEnabled !== undefined) updateData.parameterEnabled = body.parameterEnabled
    
    // 이미지 데이터 처리
    if (body.imageData !== undefined) {
      let imageData = body.imageData;
      
      if (imageData) {
        console.log('이미지 데이터 업데이트 처리 시작');
        console.log('원본 이미지 데이터 타입:', typeof imageData);
        console.log('원본 이미지 데이터 길이:', imageData.length);
        
        // 이미지 데이터가 data:image/ 형식으로 시작하면 base64 부분만 추출
        if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
          imageData = imageData.split(',')[1];
          console.log('data URL에서 base64 부분 추출');
        }
        
        // base64 문자열 유효성 검증
        if (typeof imageData === 'string' && imageData.length > 0) {
          try {
            // base64 디코딩 테스트
            const buffer = Buffer.from(imageData, 'base64');
            console.log('base64 디코딩 성공, 크기:', buffer.length, '바이트');
            
            // 이미지 데이터가 너무 작으면 오류
            if (buffer.length < 100) {
              console.error('이미지 데이터가 너무 작음:', buffer.length, '바이트');
              return NextResponse.json(
                { error: '이미지 데이터가 너무 작습니다.' },
                { status: 400 }
              );
            }
            
            updateData.imageData = imageData; // base64 문자열 그대로 저장
            
          } catch (error) {
            console.error('base64 디코딩 실패:', error);
            return NextResponse.json(
              { error: '유효하지 않은 이미지 데이터입니다.' },
              { status: 400 }
            );
          }
        } else {
          console.log('이미지 데이터 제거');
          updateData.imageData = null;
        }
      } else {
        console.log('이미지 데이터 제거');
        updateData.imageData = null;
      }
    }
    
    await agentManageRepository.update(body.id, updateData)
    
    // Fetch the updated agent with model and server info
    const agents = await agentManageRepository.findAllWithModelAndServer()
    const updatedAgent = agents.find((a: any) => a.id === body.id)
    
    // Uint8Array를 Base64 문자열로 변환
    if (updatedAgent && updatedAgent.imageData instanceof Uint8Array) {
      updatedAgent.imageData = Buffer.from(updatedAgent.imageData).toString('base64')
    }
    
    // 페이지 캐시 무효화
    revalidatePath('/admin/agent')
    
    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}

// DELETE - Delete agent
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }
    
    await agentManageRepository.delete(body.id)
    
    // 페이지 캐시 무효화
    revalidatePath('/admin/agent')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
} 