import { NextRequest, NextResponse } from 'next/server'
import { chatSessionRepository, agentManageRepository, userRepository, chatMessageRepository } from '@/lib/db/server'

export async function POST(request: NextRequest) {
  console.log('=== Chat API POST 요청 받음 ===')
  try {
    const body = await request.json()
    console.log('요청 바디:', body)
    const { agentId, modelId, modelType, initialMessage } = body

    if (!initialMessage?.trim()) {
      return NextResponse.json({ error: '초기 메시지가 필요합니다' }, { status: 400 })
    }

    // 익명 사용자 ID 가져오기 또는 생성
    let anonymousUserId = 'anonymous'
    
    // 먼저 익명 사용자가 존재하는지 확인
    const existingUsers = await userRepository.findAll()
    let anonymousUser = existingUsers.find((user: any) => user.username === 'anonymous')
    
    if (!anonymousUser) {
      // 익명 사용자가 없으면 생성
      console.log('익명 사용자 생성 중...')
      const createdUsers = await userRepository.create({
        username: 'anonymous',
        email: 'anonymous@system.local',
        password: 'no-password',
        role: 'user'
      })
      anonymousUser = createdUsers[0]
    }
    
    anonymousUserId = anonymousUser.id

    // 채팅 세션 생성
    const sessionData = {
      userId: anonymousUserId,
      title: initialMessage.substring(0, 50) + (initialMessage.length > 50 ? '...' : '')
    }

    console.log('세션 데이터:', sessionData)
    const createdSession = await chatSessionRepository.create(sessionData)
    console.log('생성된 세션:', createdSession)
    const chatId = createdSession[0]?.id
    console.log('최종 채팅 ID:', chatId)

    // 사용자 메시지 저장
    const userMessage = {
      sessionId: chatId,
      role: 'user' as const,
      content: initialMessage
    }
    console.log('사용자 메시지 저장:', userMessage)
    await chatMessageRepository.create(userMessage)

    // 에이전트 정보를 응답에 포함 (채팅 페이지에서 사용할 수 있도록)
    let agentInfo = null
    if (modelType === 'agent' && agentId) {
      const agentResult = await agentManageRepository.findById(agentId)
      if (agentResult && agentResult.length > 0) {
        agentInfo = {
          id: agentId,
          modelType: 'agent'
        }
      }
    } else if (modelType === 'model' && modelId) {
      agentInfo = {
        id: modelId,
        modelType: 'model'
      }
    }

    // 채팅 ID와 에이전트 정보 반환 (AI 응답은 채팅 페이지에서 스트리밍으로 생성)
    return NextResponse.json({ 
      chatId,
      agentInfo
    })
  } catch (error) {
    console.error('채팅 생성 오류:', error)
    return NextResponse.json({ error: '채팅 생성에 실패했습니다' }, { status: 500 })
  }
}

// 채팅 세션 목록 조회
export async function GET() {
  console.log('=== Chat API GET 요청 받음 - 채팅 세션 목록 조회 ===')
  try {
    // 익명 사용자 ID 가져오기
    let anonymousUserId = 'anonymous'
    
    // 익명 사용자 확인
    const existingUsers = await userRepository.findAll()
    let anonymousUser = existingUsers.find((user: any) => user.username === 'anonymous')
    
    if (!anonymousUser) {
      // 익명 사용자가 없으면 빈 배열 반환
      return NextResponse.json({ sessions: [] })
    }
    
    anonymousUserId = anonymousUser.id

    // 해당 사용자의 모든 채팅 세션 조회 (최신순)
    const sessions = await chatSessionRepository.findByUserId(anonymousUserId)
    
    // 세션에 대한 추가 정보 처리 (마지막 메시지 시간 등)
    const processedSessions = sessions.map((session: any) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }))
    
    // 최신순으로 정렬
    processedSessions.sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt).getTime()
      return dateB - dateA // 최신이 앞에 오도록
    })

    console.log('조회된 채팅 세션 수:', processedSessions.length)
    return NextResponse.json({ sessions: processedSessions })
    
  } catch (error) {
    console.error('채팅 세션 목록 조회 오류:', error)
    return NextResponse.json({ error: '채팅 세션 목록을 불러오는데 실패했습니다' }, { status: 500 })
  }
} 