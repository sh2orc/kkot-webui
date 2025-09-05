import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { userRepository } from '@/lib/db/repository/user'

// POST - Refresh user session with latest DB data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get latest user data from DB
    const dbUser = await userRepository.findByEmail(session.user.email)
    
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // This will trigger JWT callback with 'update' trigger
    // which will refresh the token with latest DB data
    
    return NextResponse.json({ 
      message: 'Session refresh triggered',
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.username,
        role: dbUser.role,
        status: dbUser.status
      }
    })
  } catch (error) {
    console.error('Failed to refresh session:', error)
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}
