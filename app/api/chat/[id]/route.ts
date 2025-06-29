import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { chatMessageRepository, chatSessionRepository, agentManageRepository, llmModelRepository, llmServerRepository } from '@/lib/db/server'
import { LLMFactory } from '@/lib/llm'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== Chat [id] API POST 요청 받음 ===')
  try {
    const resolvedParams = await params
    const chatId = resolvedParams.id
    console.log('Chat ID:', chatId)
    const body = await request.json()
    console.log('요청 바디:', body)
    const { message, agentId, modelId, modelType } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지가 필요합니다' }, { status: 400 })
    }

    // 채팅 세션 존재 확인
    const session = await chatSessionRepository.findById(chatId)
    console.log('세션 조회 결과:', session)
    if (!session || session.length === 0) {
      return NextResponse.json({ error: '채팅 세션을 찾을 수 없습니다' }, { status: 404 })
    }

    // 사용자 메시지 저장
    const userMessage = {
      sessionId: chatId,
      role: 'user' as const,
      content: message
    }
    console.log('사용자 메시지 저장:', userMessage)
    await chatMessageRepository.create(userMessage)

    // 기존 메시지 히스토리 조회
    const messageHistory = await chatMessageRepository.findBySessionId(chatId)

    // 에이전트 또는 모델 정보 조회
    let agent = null
    let model = null
    let systemPrompt = ''
    let llmParams: any = {}

    if (modelType === 'agent' && agentId) {
      console.log('에이전트 조회 중:', agentId)
      const agentResult = await agentManageRepository.findById(agentId)
      console.log('에이전트 조회 결과:', agentResult)
      if (agentResult && agentResult.length > 0) {
        agent = agentResult[0]
        console.log('선택된 에이전트:', agent)
        // 시스템 프롬프트가 3자 이상이면 사용
        if (agent.systemPrompt && agent.systemPrompt.trim().length >= 3) {
          systemPrompt = agent.systemPrompt
        }
        
        // 파라미터가 활성화되어 있으면 설정 적용
        if (agent.parameterEnabled) {
          llmParams = {
            temperature: parseFloat(agent.temperature || '0.7'),
            topK: agent.topK || 50,
            topP: parseFloat(agent.topP || '0.95'),
            maxTokens: agent.maxTokens || 2048,
            presencePenalty: parseFloat(agent.presencePenalty || '0.0'),
            frequencyPenalty: parseFloat(agent.frequencyPenalty || '0.0')
          }
        }
        
        // 모델 정보 조회
        console.log('모델 조회 중:', agent.modelId)
        const modelResult = await llmModelRepository.findById(agent.modelId)
        console.log('모델 조회 결과:', modelResult)
        if (modelResult && modelResult.length > 0) {
          model = modelResult[0]
          console.log('선택된 모델:', model)
        }
      }
    } else if (modelType === 'model' && modelId) {
      const modelResult = await llmModelRepository.findById(modelId)
      if (modelResult && modelResult.length > 0) {
        model = modelResult[0]
      }
    }

    if (!model) {
      return NextResponse.json({ error: '모델 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 서버 정보 조회
    console.log('서버 조회 중:', model.serverId)
    const serverResult = await llmServerRepository.findById(model.serverId)
    console.log('서버 조회 결과:', serverResult)
    if (!serverResult || serverResult.length === 0) {
      return NextResponse.json({ error: '서버 정보를 찾을 수 없습니다' }, { status: 404 })
    }
    const server = serverResult[0]
    console.log('선택된 서버:', server)

    // LLM 설정 구성
    const llmConfig = {
      provider: server.provider as any,
      modelName: model.modelId,
      apiKey: server.apiKey || undefined,
      baseUrl: server.baseUrl,
      ...llmParams
    }
    console.log('LLM 설정:', llmConfig)

    // LLM 클라이언트 생성
    console.log('LLM 클라이언트 생성 중...')
    const llmClient = LLMFactory.create(llmConfig)
    console.log('LLM 클라이언트 생성 완료')

    // 메시지 배열 구성
    const messages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = []
    
    // 시스템 프롬프트 추가 (있는 경우)
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // 기존 메시지 히스토리 추가 (최근 10개만, 방금 추가한 메시지 제외)
    const historyToUse = messageHistory.slice(0, -1).slice(-10)
    for (const historyMessage of historyToUse) {
      messages.push({
        role: historyMessage.role as 'user' | 'assistant',
        content: historyMessage.content
      })
    }

    // 현재 사용자 메시지 추가
    messages.push({ role: 'user', content: message })
    
    console.log('최종 메시지 배열:', messages)

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
          const assistantMessageId = uuidv4()

          // 스트리밍 콜백 정의
          const streamCallbacks = {
            onToken: (token: string) => {
              fullResponse += token
              
              // 클라이언트에 청크 전송
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    content: token, 
                    messageId: assistantMessageId,
                    done: false 
                  })}\n\n`
                )
              )
            },
            onComplete: async (response: any) => {
              try {
                // AI 응답 메시지 저장
                const assistantMessage = {
                  sessionId: chatId,
                  role: 'assistant' as const,
                  content: fullResponse
                }
                await chatMessageRepository.create(assistantMessage)

                // 완료 신호 전송
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ 
                      content: '', 
                      messageId: assistantMessageId,
                      done: true 
                    })}\n\n`
                  )
                )

                controller.close()
              } catch (error) {
                console.error('메시지 저장 오류:', error)
                controller.close()
              }
            },
            onError: (error: Error) => {
              console.error('스트리밍 응답 오류:', error)
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    error: 'AI 응답 생성 중 오류가 발생했습니다',
                    done: true 
                  })}\n\n`
                )
              )
              controller.close()
            }
          }

          // 스트리밍 호출
          console.log('스트리밍 호출 시작...')
          await llmClient.streamChat(messages, streamCallbacks, {
            stream: true
          })
          console.log('스트리밍 호출 완료')
        } catch (error) {
          console.error('스트리밍 초기화 오류:', error)
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                error: 'AI 응답 생성 중 오류가 발생했습니다',
                done: true 
              })}\n\n`
            )
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('메시지 전송 오류:', error)
    return NextResponse.json({ error: '메시지 전송에 실패했습니다' }, { status: 500 })
  }
}

// 채팅 메시지 히스토리 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const chatId = resolvedParams.id

    // 채팅 세션 존재 확인
    const session = await chatSessionRepository.findById(chatId)
    if (!session) {
      return NextResponse.json({ error: '채팅 세션을 찾을 수 없습니다' }, { status: 404 })
    }

    // 메시지 히스토리 조회
    const messages = await chatMessageRepository.findBySessionId(chatId)

    return NextResponse.json({ 
      chatId,
      session,
      messages: messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt
      }))
    })
  } catch (error) {
    console.error('메시지 조회 오류:', error)
    return NextResponse.json({ error: '메시지 조회에 실패했습니다' }, { status: 500 })
  }
} 