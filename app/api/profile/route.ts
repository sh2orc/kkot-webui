import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDb } from '@/lib/db/config'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '@/lib/auth'

// GET - 현재 사용자 프로필 정보 가져오기
export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = getDb()
    const user = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    }).from(users).where(eq(users.email, session.user.email)).limit(1)

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: user[0]
    })
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - 사용자 프로필 정보 수정
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { username, currentPassword, newPassword } = body

    const db = getDb()
    
    // 현재 사용자 정보 가져오기
    const currentUser = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1)
    
    if (currentUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    // 사용자명 업데이트
    if (username && username.trim()) {
      updateData.username = username.trim()
    }

    // 비밀번호 변경
    if (currentPassword && newPassword) {
      // 현재 비밀번호 검증
      const isValidPassword = verifyPassword(currentPassword, currentUser[0].password)
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // 새 비밀번호 길이 검증
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        )
      }

      updateData.password = hashPassword(newPassword)
    }

    // 사용자 정보 업데이트
    await db.update(users)
      .set(updateData)
      .where(eq(users.email, session.user.email))

    // 업데이트된 사용자 정보 반환
    const updatedUser = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    }).from(users).where(eq(users.email, session.user.email)).limit(1)

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser[0]
    })
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 