import { NextRequest, NextResponse } from 'next/server'
import { agentManageRepository } from '@/lib/db/server'

// GET - Check agent ID availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const excludeId = searchParams.get('excludeId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // 에이전트 ID 유효성 검사 (영문, 숫자, 하이픈, 언더스코어만 허용)
    const validIdPattern = /^[a-zA-Z0-9_-]+$/
    if (!validIdPattern.test(agentId)) {
      return NextResponse.json({
        available: false,
        message: '에이전트 ID는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다.'
      })
    }

    // 길이 제한 (3-50자)
    if (agentId.length < 3 || agentId.length > 50) {
      return NextResponse.json({
        available: false,
        message: '에이전트 ID는 3자 이상 50자 이하여야 합니다.'
      })
    }

    const isAvailable = await agentManageRepository.isAgentIdAvailable(agentId, excludeId || undefined)
    
    return NextResponse.json({
      available: isAvailable,
      message: isAvailable ? '사용 가능한 에이전트 ID입니다.' : '이미 사용 중인 에이전트 ID입니다.'
    })
  } catch (error) {
    console.error('Failed to check agent ID availability:', error)
    return NextResponse.json(
      { error: '에이전트 ID 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 