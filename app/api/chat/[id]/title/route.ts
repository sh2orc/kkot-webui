import { NextRequest, NextResponse } from 'next/server'
import { chatSessionRepository, chatMessageRepository, llmModelRepository, llmServerRepository } from '@/lib/db/server'
import { LLMFactory } from '@/lib/llm'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
      console.log('=== Chat Title Generation API POST request received ===')
  try {
    const resolvedParams = await params
    const chatId = resolvedParams.id
    console.log('Chat ID:', chatId)
    const body = await request.json()
    console.log('Request body keys:', Object.keys(body))
    console.log('User message length:', body.userMessage?.length)
    console.log('Assistant message length:', body.assistantMessage?.length)
    const { userId, userMessage, assistantMessage } = body

    if (!userId) {
      return NextResponse.json({ error: '사용자 인증이 필요합니다' }, { status: 401 })
    }

    if (!userMessage || !assistantMessage) {
      return NextResponse.json({ error: '사용자 메시지와 어시스턴트 응답이 필요합니다' }, { status: 400 })
    }

    // Check chat session existence and permissions
    const session = await chatSessionRepository.findById(chatId)
    if (!session || session.length === 0) {
      return NextResponse.json({ error: '채팅 세션을 찾을 수 없습니다' }, { status: 404 })
    }

    // Verify session owner
    if (session[0].userId !== userId) {
      return NextResponse.json({ error: '이 채팅에 대한 접근 권한이 없습니다' }, { status: 403 })
    }

    // Get default model information (for title generation)
    const publicModels = await llmModelRepository.findPublic()
    if (!publicModels || publicModels.length === 0) {
      return NextResponse.json({ error: '제목 생성용 모델을 찾을 수 없습니다' }, { status: 404 })
    }

    // Use first public model
    const model = publicModels[0]
    const serverResult = await llmServerRepository.findById(model.serverId)
    if (!serverResult || serverResult.length === 0) {
      return NextResponse.json({ error: 'Server information not found' }, { status: 404 })
    }
    const server = serverResult[0]

    // LLM configuration
    const llmConfig = {
      provider: server.provider as any,
      modelName: model.modelId,
      apiKey: server.apiKey || undefined,
      baseUrl: server.baseUrl,
      temperature: 0.3, // Use low temperature for title generation
      maxTokens: 50 // Keep titles short
    }

    // Create LLM client
    const llmClient = LLMFactory.create(llmConfig)

    // Generate title prompt in English (LLM will respond in the same language as the conversation)
    const titlePrompt = `Generate a concise and clear title based on the following conversation.
    
Rules:
- Generate the title in the SAME LANGUAGE as the conversation (Korean for Korean conversation, English for English conversation, Japanese for Japanese conversation, etc.)
- Keep the title within 15 characters/words appropriate for the language
- Summarize the core topic or question content of the conversation
- Respond with title only, no quotes or special characters
- Write concisely without formal language

User question: ${userMessage}
Assistant answer: ${assistantMessage.substring(0, 200)}...

Title:`

    const messages = [
      { role: 'user' as const, content: titlePrompt }
    ]

    // Generate title
    console.log('Calling LLM for title generation...')
    const response = await llmClient.chat(messages, { maxTokens: 50 })
    console.log('LLM response received:', response.content)
    let generatedTitle = response.content.trim()

    // Clean up title (remove quotes, special characters, limit length)
    generatedTitle = generatedTitle
      .replace(/^["'`]|["'`]$/g, '') // Remove quotes
      .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
      .replace(/^\s+|\s+$/g, '') // Remove leading/trailing whitespace
    
    if (generatedTitle.length > 30) {
      generatedTitle = generatedTitle.substring(0, 27) + '...'
    }

    // Use default title if generated title is empty or too short
    if (!generatedTitle || generatedTitle.length < 2) {
      generatedTitle = userMessage.substring(0, 15) + (userMessage.length > 15 ? '...' : '')
    }

    // Update chat session title
    const updateResult = await chatSessionRepository.update(chatId, { title: generatedTitle })
    console.log('Title update result:', updateResult)

    console.log('=== Title generation completed successfully ===')
    console.log('Chat ID:', chatId)
    console.log('Generated title:', generatedTitle)
    console.log('Original user message:', userMessage.substring(0, 50) + '...')
    
    return NextResponse.json({ 
      title: generatedTitle,
      chatId: chatId,
      success: true 
    })

  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 })
  }
} 