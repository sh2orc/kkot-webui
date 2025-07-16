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

    // Agent ID validation (only allows letters, numbers, hyphens, underscores)
    const validIdPattern = /^[a-zA-Z0-9_-]+$/
    if (!validIdPattern.test(agentId)) {
      return NextResponse.json({
        available: false,
        message: 'Agent ID can only contain letters, numbers, hyphens (-), and underscores (_).'
      })
    }

    // Length restriction (3-50 characters)
    if (agentId.length < 3 || agentId.length > 50) {
      return NextResponse.json({
        available: false,
        message: 'Agent ID must be between 3 and 50 characters.'
      })
    }

    const isAvailable = await agentManageRepository.isAgentIdAvailable(agentId, excludeId || undefined)
    
    return NextResponse.json({
      available: isAvailable,
      message: isAvailable ? 'Agent ID is available.' : 'Agent ID is already in use.'
    })
  } catch (error) {
    console.error('Failed to check agent ID availability:', error)
    return NextResponse.json(
      { error: 'An error occurred while checking agent ID availability.' },
      { status: 500 }
    )
  }
} 