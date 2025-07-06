import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { chatMessageRepository } from '@/lib/db/repository'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('=== Rating API POST request received ===')
  console.log('Request timestamp:', new Date().toISOString())
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const resolvedParams = await params
    const chatId = resolvedParams.id
    console.log('Chat ID:', chatId)
    
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('Authentication failed - no session or user ID')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.log('User authenticated:', session.user.id)

    // Check if request body exists and is valid JSON
    let requestBody
    let text = ''
    try {
      text = await request.text()
      console.log('Raw request text:', text)
      console.log('Request text length:', text.length)
      
      if (!text.trim()) {
        console.log('Empty request body detected')
        return NextResponse.json({ error: 'Empty request body' }, { status: 400 })
      }
      
      requestBody = JSON.parse(text)
      console.log('Parsed request body:', requestBody)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      console.error('Failed to parse text:', text)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { messageId, rating } = requestBody
    console.log('Extracted messageId:', messageId, 'rating:', rating)

    if (!messageId) {
      console.log('Missing messageId in request')
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    if (typeof rating !== 'number' || rating < -1 || rating > 1) {
      console.log('Invalid rating value:', rating, 'type:', typeof rating)
      return NextResponse.json({ error: 'Invalid rating value. Must be -1, 0, or 1' }, { status: 400 })
    }

    // Update message rating
    console.log('Updating message rating...')
    const updatedMessage = await chatMessageRepository.updateRating(messageId, rating)
    console.log('Rating updated successfully:', updatedMessage)

    return NextResponse.json({ 
      success: true, 
      messageId,
      rating,
      updatedMessage 
    })

  } catch (error) {
    console.error('Rating update error:', error)
    return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 })
  }
} 