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
    
    // Check Content-Type to determine how to parse the request
    const contentType = request.headers.get('content-type') || ''
    let body: any
    let agentId: string | undefined
    let modelId: string | undefined
    let modelType: string
    let initialMessage: string
    let isDeepResearchActive: boolean = false
    let isGlobeActive: boolean = false
    let images: File[] = []
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with images)
      console.log('Processing FormData request')
      const formData = await request.formData()
      
      agentId = formData.get('agentId') as string | undefined
      modelId = formData.get('modelId') as string | undefined
      modelType = formData.get('modelType') as string || 'model'
      initialMessage = formData.get('message') as string || ''
      isDeepResearchActive = formData.get('isDeepResearchActive') === 'true'
      isGlobeActive = formData.get('isGlobeActive') === 'true'
      
      // Extract image files
      const imageFiles = formData.getAll('images') as File[]
      images = imageFiles.filter(file => file instanceof File && file.size > 0)
      
      console.log('FormData parsed:', {
        agentId,
        modelId,
        modelType,
        messageLength: initialMessage.length,
        imagesCount: images.length,
        isDeepResearchActive,
        isGlobeActive
      })
    } else {
      // Handle JSON request (text only)
      console.log('Processing JSON request')
      body = await request.json()
      console.log('Request body:', body)
      
      agentId = body.agentId
      modelId = body.modelId
      modelType = body.modelType
      initialMessage = body.initialMessage
      isDeepResearchActive = body.isDeepResearchActive || false
      isGlobeActive = body.isGlobeActive || false
    }
    
    console.log('🔍 Deep research parameters in chat session creation:')
    console.log('  isDeepResearchActive:', isDeepResearchActive)
    console.log('  isGlobeActive:', isGlobeActive)

    if (!initialMessage?.trim() && images.length === 0) {
      return NextResponse.json({ error: 'Initial message or images are required' }, { status: 400 })
    }

    // Create chat session with temporary title
    let chatTitle = initialMessage?.trim() || 'Image Chat'
    if (images.length > 0 && !initialMessage?.trim()) {
      chatTitle = `Image Chat (${images.length} image${images.length > 1 ? 's' : ''})`
    } else if (images.length > 0 && initialMessage?.trim()) {
      chatTitle = initialMessage.substring(0, 15) + ` (+${images.length} image${images.length > 1 ? 's' : ''})`
    } else {
      chatTitle = initialMessage.substring(0, 20) + (initialMessage.length > 20 ? '...' : '')
    }
    
    const sessionData = {
      userEmail: session.user.email,
      title: chatTitle
    }

    console.log('Session data:', sessionData)
    const createdSession = await chatSessionRepository.create(sessionData)
    console.log('Created session:', createdSession)
    const chatId = createdSession[0]?.id
    console.log('Final chat ID:', chatId)

    // Save user message (with image information if present)
    let userMessageContent = initialMessage
    
    // If images are present, convert to JSON format with base64 data
    if (images && images.length > 0) {
      const imageInfos = await Promise.all(
        images.map(async (image) => {
          // Convert image to base64
          const arrayBuffer = await image.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          const dataUrl = `data:${image.type};base64,${base64}`
          
          return {
            type: 'image',
            name: image.name,
            size: image.size,
            mimeType: image.type,
            data: dataUrl
          }
        })
      )
      
      userMessageContent = JSON.stringify({
        text: initialMessage || '',
        images: imageInfos,
        hasImages: true
      })
      
      console.log('User message with images:', {
        textLength: initialMessage.length,
        imagesCount: imageInfos.length,
        totalContentLength: userMessageContent.length
      })
    }
    
    const userMessage = {
      sessionId: chatId,
      role: 'user' as const,
      content: userMessageContent
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

    // If deep research is active, trigger immediate AI response generation
    if (isDeepResearchActive && agentInfo) {
      console.log('🚀 Deep research is active - triggering immediate AI response generation')
      
      // Immediately send request to /api/chat/[chatId] to create deep research response
      try {
        const aiResponseBody = {
          message: initialMessage,
          agentId: agentInfo.modelType === 'agent' ? agentInfo.id : undefined,
          modelId: agentInfo.modelType === 'model' ? agentInfo.id : undefined,
          modelType: agentInfo.modelType,
          isRegeneration: false,
          isDeepResearchActive: isDeepResearchActive,  // Use actual value instead of hardcoded true
          isGlobeActive: isGlobeActive || false,
          userId: session.user.email
        }
        
        console.log('🚀 Triggering AI response with body:', aiResponseBody)
        
        // Create AI response in background (without await)
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