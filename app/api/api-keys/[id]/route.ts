import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { apiKeysRepository } from '@/lib/db/repository'
import { randomBytes, createHash } from 'crypto'

// API key regeneration helper function
function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const key = `kkot-${randomBytes(32).toString('hex')}`
  const keyHash = createHash('sha256').update(key).digest('hex')
  const keyPrefix = key.substring(0, 12) + '...'
  
  return { key, keyHash, keyPrefix }
}

// Get specific API key (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = await apiKeysRepository.findById(params.id)
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Return without key hash for security
    const safeApiKey = {
      ...apiKey,
      keyHash: undefined,
      permissions: apiKey.permissions ? JSON.parse(apiKey.permissions) : [],
      allowedIps: apiKey.allowedIps ? JSON.parse(apiKey.allowedIps) : null
    }

    return NextResponse.json(safeApiKey)
  } catch (error) {
    console.error('API Key GET error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Update API key (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      permissions,
      rateLimitTier,
      maxRequestsPerHour,
      maxRequestsPerDay,
      allowedIps,
      expiresAt,
      isActive,
      regenerate = false
    } = body

    // Check existing key
    const existingKey = await apiKeysRepository.findById(params.id)
    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    let updateData: any = {}
    
    if (name !== undefined) updateData.name = name.trim()
    if (permissions !== undefined) updateData.permissions = Array.isArray(permissions) ? permissions : ['chat', 'models']
    if (rateLimitTier !== undefined) updateData.rateLimitTier = rateLimitTier
    if (maxRequestsPerHour !== undefined) updateData.maxRequestsPerHour = maxRequestsPerHour
    if (maxRequestsPerDay !== undefined) updateData.maxRequestsPerDay = maxRequestsPerDay
    if (allowedIps !== undefined) updateData.allowedIps = allowedIps && allowedIps.length > 0 ? allowedIps : null
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (isActive !== undefined) updateData.isActive = isActive

    let newKey = null
    
    // If key regeneration requested
    if (regenerate) {
      const { key, keyHash, keyPrefix } = generateApiKey()
      updateData.keyHash = keyHash
      updateData.keyPrefix = keyPrefix
      newKey = key
    }

    // Update database
    const updatedApiKey = await apiKeysRepository.update(params.id, updateData)

    if (!updatedApiKey || updatedApiKey.length === 0) {
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
    }

    const responseData = {
      ...updatedApiKey[0],
      keyHash: undefined,
      permissions: updatedApiKey[0].permissions ? JSON.parse(updatedApiKey[0].permissions) : [],
      allowedIps: updatedApiKey[0].allowedIps ? JSON.parse(updatedApiKey[0].allowedIps) : null
    }

    // Include regenerated key if available
    if (newKey) {
      (responseData as any).key = newKey
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('API Key PUT error:', error)
    return NextResponse.json({ 
      error: 'Failed to update API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Delete API key (DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check existing key
    const existingKey = await apiKeysRepository.findById(params.id)
    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Delete key
    await apiKeysRepository.delete(params.id)

    return NextResponse.json({ message: 'API key deleted successfully' })
  } catch (error) {
    console.error('API Key DELETE error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 