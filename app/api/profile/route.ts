import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { userRepository } from '@/lib/db/repository'
import { hashPassword, verifyPassword } from '@/lib/auth'

// GET - Fetch current user profile information
export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await userRepository.findByEmail(session.user.email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user profile information
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
    const { username, currentPassword, newPassword, profileImage } = body

    // Get current user information
    const currentUser = await userRepository.findByEmail(session.user.email)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    // Update username
    if (username && username.trim()) {
      updateData.username = username.trim()
    }

    // Update profile image
    if (profileImage !== undefined) {
      if (profileImage && typeof profileImage === 'string') {
        // Process base64 image data
        let imageData = profileImage
        
        // If image data starts with data:image/, extract only base64 part
        if (imageData.startsWith('data:image/')) {
          imageData = imageData.split(',')[1]
        }
        
        // Validate base64 string
        try {
          const buffer = Buffer.from(imageData, 'base64')
          if (buffer.length < 100) {
            return NextResponse.json(
              { error: 'Image data is too small' },
              { status: 400 }
            )
          }
          updateData.profileImage = profileImage // Store full data URL
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid image data' },
            { status: 400 }
          )
        }
      } else {
        // Remove profile image
        updateData.profileImage = null
      }
    }

    // Change password
    if (currentPassword && newPassword) {
      // Verify current password
      const isValidPassword = verifyPassword(currentPassword, currentUser.password)
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        )
      }

      updateData.password = hashPassword(newPassword)
    }

    // Update user information
    const [updatedUser] = await userRepository.update(currentUser.id, updateData)

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        createdAt: updatedUser.createdAt
      }
    })
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 