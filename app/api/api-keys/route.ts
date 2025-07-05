import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { apiKeysRepository } from '@/lib/db/repository'
import { randomBytes, createHash } from 'crypto'

// API key generation helper function
function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const key = `kkot-${randomBytes(32).toString('hex')}`
  const keyHash = createHash('sha256').update(key).digest('hex')
  const keyPrefix = key.substring(0, 12) + '...'
  
  return { key, keyHash, keyPrefix }
}

// Get API keys (GET)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKeys = await apiKeysRepository.findAll()
    
    // Return without key hash for security
    const safeApiKeys = apiKeys.map((key: any) => ({
      ...key,
      keyHash: undefined,
      permissions: key.permissions ? JSON.parse(key.permissions) : [],
      allowedIps: key.allowedIps ? JSON.parse(key.allowedIps) : null
    }))

    return NextResponse.json(safeApiKeys)
  } catch (error) {
    console.error('API Keys GET error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch API keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create API key (POST)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      permissions = ['chat', 'models'],
      rateLimitTier = 'basic',
      maxRequestsPerHour,
      maxRequestsPerDay,
      allowedIps,
      expiresAt
    } = body

    // Input validation
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Key name is required.' }, { status: 400 })
    }

    // Rate limit configuration
    let requestsPerHour = maxRequestsPerHour
    let requestsPerDay = maxRequestsPerDay
    
    if (!requestsPerHour || !requestsPerDay) {
      switch (rateLimitTier) {
        case 'basic':
          requestsPerHour = requestsPerHour || 100
          requestsPerDay = requestsPerDay || 1000
          break
        case 'premium':
          requestsPerHour = requestsPerHour || 1000
          requestsPerDay = requestsPerDay || 10000
          break
        case 'unlimited':
          requestsPerHour = requestsPerHour || 999999
          requestsPerDay = requestsPerDay || 999999
          break
      }
    }

    // Generate API key
    const { key, keyHash, keyPrefix } = generateApiKey()

    // Save to database
    const newApiKey = await apiKeysRepository.create({
      name: name.trim(),
      keyHash,
      keyPrefix,
      permissions: Array.isArray(permissions) ? permissions : ['chat', 'models'],
      rateLimitTier,
      maxRequestsPerHour: requestsPerHour,
      maxRequestsPerDay: requestsPerDay,
      allowedIps: allowedIps && allowedIps.length > 0 ? allowedIps : null,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })

    return NextResponse.json({
      ...newApiKey[0],
      key, // Return generated key only once
      keyHash: undefined,
      permissions: JSON.parse(newApiKey[0].permissions),
      allowedIps: newApiKey[0].allowedIps ? JSON.parse(newApiKey[0].allowedIps) : null
    })
  } catch (error) {
    console.error('API Key POST error:', error)
    return NextResponse.json({ 
      error: 'Failed to create API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 