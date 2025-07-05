import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { apiUsageRepository, apiKeysRepository } from '@/lib/db/repository'

// Get API usage statistics (GET)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const apiKeyId = searchParams.get('apiKeyId')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get overall usage
    if (!apiKeyId) {
      const usageData = await apiUsageRepository.findAll(limit)
      
      // Calculate basic statistics
      const totalRequests = usageData.length
      const successfulRequests = usageData.filter((usage: any) => usage.statusCode < 400).length
      const errorRequests = usageData.filter((usage: any) => usage.statusCode >= 400).length
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests * 100).toFixed(2) : '0'

      // Calculate average response time
      const avgResponseTime = usageData.length > 0 
        ? Math.round(usageData.reduce((sum: any, usage: any) => sum + (usage.responseTimeMs || 0), 0) / usageData.length)
        : 0

      // Hourly request count (last 24 hours)
      const now = new Date()
      const hourlyStats = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(now.getTime() - (i * 60 * 60 * 1000))
        const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours())
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
        
        const hourlyData = usageData.filter((usage: any) => {
          const usageTime = new Date(usage.createdAt)
          return usageTime >= hourStart && usageTime < hourEnd
        })

        return {
          hour: hourStart.toISOString(),
          requests: hourlyData.length,
          errors: hourlyData.filter((usage: any) => usage.statusCode >= 400).length
        }
      }).reverse()

      // Statistics by endpoint
      const endpointStats = usageData.reduce((acc: any, usage: any) => {
        const endpoint = usage.endpoint
        if (!acc[endpoint]) {
          acc[endpoint] = {
            endpoint,
            requests: 0,
            errors: 0,
            totalResponseTime: 0
          }
        }
        acc[endpoint].requests++
        if (usage.statusCode >= 400) {
          acc[endpoint].errors++
        }
        acc[endpoint].totalResponseTime += usage.responseTimeMs || 0
        return acc
      }, {} as Record<string, any>)

      const endpointStatsArray = Object.values(endpointStats).map((stat: any) => ({
        ...stat,
        avgResponseTime: stat.requests > 0 ? Math.round(stat.totalResponseTime / stat.requests) : 0
      }))

      return NextResponse.json({
        summary: {
          totalRequests,
          successfulRequests,
          errorRequests,
          errorRate: parseFloat(errorRate),
          avgResponseTime
        },
        hourlyStats,
        endpointStats: endpointStatsArray,
        recentUsage: usageData.slice(0, 50) // Recent 50 items
      })
    }

    // Get usage for specific API key
    const keyUsage = await apiUsageRepository.findByApiKey(apiKeyId, limit)
    return NextResponse.json(keyUsage)

  } catch (error) {
    console.error('API Usage GET error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch API usage statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Record API usage (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      apiKeyId,
      endpoint,
      method,
      statusCode,
      tokensUsed,
      responseTimeMs,
      errorMessage,
      ipAddress,
      userAgent
    } = body

    // Input validation
    if (!apiKeyId || !endpoint || !method || statusCode === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: apiKeyId, endpoint, method, statusCode' 
      }, { status: 400 })
    }

    // Verify API key exists
    const apiKey = await apiKeysRepository.findById(apiKeyId)
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Record usage
    const usage = await apiUsageRepository.create({
      apiKeyId,
      endpoint,
      method,
      statusCode,
      tokensUsed,
      responseTimeMs,
      errorMessage,
      ipAddress,
      userAgent
    })

    // Update API key last used time
    await apiKeysRepository.update(apiKeyId, {
      lastUsedAt: new Date()
    })

    return NextResponse.json(usage[0])
  } catch (error) {
    console.error('API Usage POST error:', error)
    return NextResponse.json({ 
      error: 'Failed to record API usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 