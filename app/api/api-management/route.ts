import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { apiManagementRepository } from '@/lib/db/repository'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch API management settings
    const apiManagement = await apiManagementRepository.findById()

    if (!apiManagement) {
      // Return default settings if no configuration exists
      return NextResponse.json(apiManagementRepository.getDefaultSettings())
    }

    return NextResponse.json({
      apiEnabled: apiManagement.apiEnabled,
      openaiCompatible: apiManagement.openaiCompatible,
      corsEnabled: apiManagement.corsEnabled,
      corsOrigins: apiManagement.corsOrigins,
      rateLimitEnabled: apiManagement.rateLimitEnabled,
      rateLimitRequests: apiManagement.rateLimitRequests,
      rateLimitWindow: apiManagement.rateLimitWindow,
      requireAuth: apiManagement.requireAuth,
      apiKeyEnabled: apiManagement.apiKeyEnabled,
      apiKeyEndpointLimited: apiManagement.apiKeyEndpointLimited,
    })
  } catch (error) {
    console.error('API Management GET error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch API management settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      apiEnabled,
      openaiCompatible,
      corsEnabled,
      corsOrigins,
      rateLimitEnabled,
      rateLimitRequests,
      rateLimitWindow,
      requireAuth,
      apiKeyEnabled,
      apiKeyEndpointLimited,
    } = body

    // Save data using Drizzle ORM
    await apiManagementRepository.upsert({
      apiEnabled,
      openaiCompatible,
      corsEnabled,
      corsOrigins,
      rateLimitEnabled,
      rateLimitRequests,
      rateLimitWindow,
      requireAuth,
      apiKeyEnabled,
      apiKeyEndpointLimited,
    })

    return NextResponse.json({ 
      success: true,
      message: 'API management settings saved successfully'
    })
  } catch (error) {
    console.error('API Management PUT error:', error)
    return NextResponse.json({ 
      error: 'Failed to save API management settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 