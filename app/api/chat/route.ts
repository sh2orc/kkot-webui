import { NextRequest, NextResponse } from 'next/server'
import { chatSessionRepository, agentManageRepository, userRepository, chatMessageRepository } from '@/lib/db/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  console.log('=== Chat API POST request received ===')
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }
    
    const body = await request.json()
    console.log('Request body:', body)
    const { agentId, modelId, modelType, initialMessage, isDeepResearchActive, isGlobeActive } = body
    
    console.log('🔍 Deep research parameters in chat session creation:')
    console.log('  isDeepResearchActive:', isDeepResearchActive)
    console.log('  isGlobeActive:', isGlobeActive)

    if (!initialMessage?.trim()) {
      return NextResponse.json({ error: 'Initial message is required' }, { status: 400 })
    }

    // Create chat session with temporary title
    const sessionData = {
      userEmail: session.user.email,
      title: initialMessage.substring(0, 20) + (initialMessage.length > 20 ? '...' : '')
    }

    console.log('Session data:', sessionData)
    const createdSession = await chatSessionRepository.create(sessionData)
    console.log('Created session:', createdSession)
    const chatId = createdSession[0]?.id
    console.log('Final chat ID:', chatId)

    // Save user message
    const userMessage = {
      sessionId: chatId,
      role: 'user' as const,
      content: initialMessage
    }
    console.log('Saving user message:', userMessage)
    await chatMessageRepository.create(userMessage)

    // Include agent information in response (for use in chat page)
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

    // 딥리서치가 활성화된 경우 즉시 AI 응답 생성 트리거
    if (isDeepResearchActive && agentInfo) {
      console.log('🚀 Deep research is active - triggering immediate AI response generation')
      
      // 즉시 /api/chat/[chatId] 로 요청을 보내서 딥리서치 응답 생성
      try {
        const aiResponseBody = {
          message: initialMessage,
          agentId: agentInfo.modelType === 'agent' ? agentInfo.id : undefined,
          modelId: agentInfo.modelType === 'model' ? agentInfo.id : undefined,
          modelType: agentInfo.modelType,
          isRegeneration: false,
          isDeepResearchActive: true,
          isGlobeActive: isGlobeActive || false,
          userId: session.user.email
        }
        
        console.log('🚀 Triggering AI response with body:', aiResponseBody)
        
        // 백그라운드에서 AI 응답 생성 (await 하지 않음)
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/chat/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify(aiResponseBody)
        }).catch(error => {
          console.error('Background AI response generation failed:', error)
        })
        
        console.log('🚀 Background AI response generation started')
      } catch (error) {
        console.error('Failed to trigger AI response:', error)
      }
    }
    
    // Return chat ID and agent info (AI response will be generated via streaming in chat page)
    return NextResponse.json({ 
      chatId,
      agentInfo,
      deepResearchTriggered: isDeepResearchActive
    })
  } catch (error) {
    console.error('Chat creation error:', error)
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
  }
}

// Retrieve chat session list
export async function GET(request: NextRequest) {
  console.log('=== Chat API GET request received - Chat session list query ===')
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }

    // Retrieve all chat sessions for the user (in descending order)
    const sessions = await chatSessionRepository.findByUserEmail(session.user.email)
    
    // Process additional session information (last message time, etc.)
    const processedSessions = sessions.map((session: any) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }))
    
    // Sort in descending order (newest first)
    processedSessions.sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt).getTime()
      return dateB - dateA // Newest first
    })

    console.log('Retrieved chat session count:', processedSessions.length)
    return NextResponse.json({ sessions: processedSessions })
    
  } catch (error) {
    console.error('Chat session list retrieval error:', error)
    return NextResponse.json({ error: 'Failed to load chat session list' }, { status: 500 })
  }
} 