import { NextRequest, NextResponse } from "next/server"
import { userRepository, groupRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { createAuthOptions } from "@/app/api/auth/[...nextauth]/route"
import { hashPassword } from "@/lib/auth"

interface Params {
  params: {
    id: string
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    // Await params to comply with Next.js 15 dynamic API rules
    const resolvedParams = await params
    
    // Check authentication
    const authOptions = await createAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const users = await userRepository.findById(resolvedParams.id)
    const user = users[0]

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get user roles
    const roles = await userRepository.getUserRoles(user.id)
    
    // Get user groups
    const groups = await groupRepository.getUserGroups(user.id)

    // Remove sensitive information
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      department: user.department,
      phone_number: user.phoneNumber,
      status: user.status || 'active',
      email_verified: user.emailVerified || false,
      last_login_at: user.lastLoginAt,  // DB 스키마와 일치하도록 수정
      failed_login_attempts: user.failedLoginAttempts || 0,
      locked_until: user.lockedUntil,
      profile_image: user.profileImage,
      // OAuth 정보 추가
      oauth_provider: user.oauthProvider,
      google_id: user.googleId,
      oauth_linked_at: user.oauthLinkedAt,
      oauth_profile_picture: user.oauthProfilePicture,
      roles: roles,
      groups: groups,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }

    return NextResponse.json(sanitizedUser)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    // Check authentication
    const authOptions = await createAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const resolvedParams = await params;
    const data = await req.json()
    const { name, email, role, password, department, phone_number, status, roles, groups } = data

    const users = await userRepository.findById(resolvedParams.id)
    const user = users[0]

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Update user
    const updateData: any = {}
    if (name !== undefined) updateData.username = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (password !== undefined) updateData.password = hashPassword(password)
    if (department !== undefined) updateData.department = department
    if (phone_number !== undefined) updateData.phoneNumber = phone_number
    if (status !== undefined) updateData.status = status

    const updatedUsers = await userRepository.update(resolvedParams.id, updateData)
    const updatedUser = updatedUsers[0]

    // Check if role is being changed to 'user' and user has never logged in
    if (role === 'user' && !user.lastLoginAt) {
      // Get current user groups
      const currentGroups = await groupRepository.getUserGroups(resolvedParams.id)
      
      // If user has no groups or only has empty groups, assign default group
      if (currentGroups.length === 0) {
        await groupRepository.addUser('default', resolvedParams.id, session.user.id)
      }
    }

    // Update roles if provided
    if (roles && Array.isArray(roles)) {
      await userRepository.updateUserRoles(resolvedParams.id, roles)
    }
    
    // Update groups if provided
    if (groups && Array.isArray(groups)) {
      await groupRepository.setUserGroups(resolvedParams.id, groups, session.user.id)
    }

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.username,
      role: updatedUser.role,
      department: updatedUser.department,
      status: updatedUser.status
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Await params to comply with Next.js 15 dynamic API rules
    const resolvedParams = await params
    
    // Check authentication
    const authOptions = await createAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const users = await userRepository.findById(resolvedParams.id)
    const user = users[0]

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Prevent deleting yourself
    if (user.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    await userRepository.delete(resolvedParams.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
