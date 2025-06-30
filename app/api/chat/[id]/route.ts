import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { chatMessageRepository, chatSessionRepository, agentManageRepository, llmModelRepository, llmServerRepository } from '@/lib/db/server'
import { LLMFactory } from '@/lib/llm'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== Chat [id] API POST request received ===')
  try {
    const resolvedParams = await params
    const chatId = resolvedParams.id
    console.log('Chat ID:', chatId)
    const body = await request.json()
    console.log('Request body:', body)
    const { message, agentId, modelId, modelType, userId } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }

    // Check chat session existence and verify permissions
    const session = await chatSessionRepository.findById(chatId)
    console.log('Session query result:', session)
    if (!session || session.length === 0) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Check session owner
    if (session[0].userId !== userId) {
      return NextResponse.json({ error: 'Access denied to this chat' }, { status: 403 })
    }

    // Save user message
    const userMessage = {
      sessionId: chatId,
      role: 'user' as const,
      content: message
    }
    console.log('Saving user message:', userMessage)
    await chatMessageRepository.create(userMessage)

    // Retrieve existing message history
    const messageHistory = await chatMessageRepository.findBySessionId(chatId)

    // Retrieve agent or model information
    let agent = null
    let model = null
    let systemPrompt = ''
    let llmParams: any = {}

    if (modelType === 'agent' && agentId) {
      console.log('Querying agent:', agentId)
      const agentResult = await agentManageRepository.findById(agentId)
      console.log('Agent query result:', agentResult)
      if (agentResult && agentResult.length > 0) {
        agent = agentResult[0]
        console.log('Selected agent:', agent)
        // Use system prompt if it's 3 characters or longer
        if (agent.systemPrompt && agent.systemPrompt.trim().length >= 3) {
          systemPrompt = agent.systemPrompt
        }
        
        // Apply parameter settings if enabled
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
        
        // Retrieve model information
        console.log('Querying model:', agent.modelId)
        const modelResult = await llmModelRepository.findById(agent.modelId)
        console.log('Model query result:', modelResult)
        if (modelResult && modelResult.length > 0) {
          model = modelResult[0]
          console.log('Selected model:', model)
        }
      }
    } else if (modelType === 'model' && modelId) {
      const modelResult = await llmModelRepository.findById(modelId)
      if (modelResult && modelResult.length > 0) {
        model = modelResult[0]
      }
    }

    if (!model) {
      return NextResponse.json({ error: 'Model information not found' }, { status: 404 })
    }

    // Retrieve server information
    console.log('Querying server:', model.serverId)
    const serverResult = await llmServerRepository.findById(model.serverId)
    console.log('Server query result:', serverResult)
    if (!serverResult || serverResult.length === 0) {
      return NextResponse.json({ error: 'Server information not found' }, { status: 404 })
    }
    const server = serverResult[0]
    console.log('Selected server:', server)

    // Configure LLM settings
    const llmConfig = {
      provider: server.provider as any,
      modelName: model.modelId,
      apiKey: server.apiKey || undefined,
      baseUrl: server.baseUrl,
      ...llmParams
    }
    console.log('LLM config:', llmConfig)

    // Create LLM client
    console.log('Creating LLM client...')
    const llmClient = LLMFactory.create(llmConfig)
    console.log('LLM client created')

    // Construct message array
    const messages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = []
    
    // Add system prompt (if exists)
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Add existing message history (only recent 10, excluding just added message)
    const historyToUse = messageHistory.slice(0, -1).slice(-10)
    for (const historyMessage of historyToUse) {
      messages.push({
        role: historyMessage.role as 'user' | 'assistant',
        content: historyMessage.content
      })
    }

    // Add current user message
    messages.push({ role: 'user', content: message })
    
    console.log('Final message array:', messages)

    // Generate streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
          const assistantMessageId = uuidv4()

          // Define streaming callbacks
          const streamCallbacks = {
            onToken: (token: string) => {
              fullResponse += token
              
              // Send chunk to client
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
                // Save AI response message
                const assistantMessage = {
                  sessionId: chatId,
                  role: 'assistant' as const,
                  content: fullResponse
                }
                await chatMessageRepository.create(assistantMessage)

                // Send completion signal
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
                console.error('Message save error:', error)
                controller.close()
              }
            },
            onError: (error: Error) => {
              console.error('Streaming response error:', error)
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    error: 'An error occurred while generating AI response',
                    done: true 
                  })}\n\n`
                )
              )
              controller.close()
            }
          }

          // Streaming call
          console.log('Starting streaming call...')
          await llmClient.streamChat(messages, streamCallbacks, {
            stream: true
          })
          console.log('Streaming call completed')
        } catch (error) {
          console.error('Streaming initialization error:', error)
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                error: 'An error occurred while generating AI response',
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
    console.error('Message sending error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// Retrieve chat message history
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const chatId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }

    // Check chat session existence and verify permissions
    const session = await chatSessionRepository.findById(chatId)
    if (!session || session.length === 0) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Check session owner
    if (session[0].userId !== userId) {
      return NextResponse.json({ error: 'Access denied to this chat' }, { status: 403 })
    }

    // Retrieve message history
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
    console.error('Message retrieval error:', error)
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 })
  }
} 