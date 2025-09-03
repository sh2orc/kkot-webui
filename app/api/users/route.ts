import { NextRequest, NextResponse } from "next/server"
import { userRepository, groupRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { createAuthOptions } from "@/app/api/auth/[...nextauth]/route"
import { hashPassword } from "@/lib/auth"

export async function GET(req: NextRequest) {
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

    const users = await userRepository.findAll()

    // Remove sensitive information
    const sanitizedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      department: user.department,
      status: user.status || 'active',
      email_verified: user.email_verified || false,
      last_login_at: user.lastLoginAt || user.last_login_at,
      // OAuth 정보 추가
      oauth_provider: user.oauthProvider,
      google_id: user.googleId,
      oauth_linked_at: user.oauthLinkedAt,
      oauth_profile_picture: user.oauthProfilePicture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))

    return NextResponse.json(sanitizedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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

    const data = await req.json()
    const { email, name, password, role = 'user', department, phone_number, status = 'active', roles = [], groups = [] } = data

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      )
    }

    // Create new user
    const newUser = await userRepository.create({
      username: name,
      email,
      password: hashPassword(password), // Hash the password
      role,
      department,
      phone_number,
      status,
      email_verified: 0
    })

    // Assign roles if provided
    if (roles.length > 0) {
      await userRepository.assignRoles(newUser[0].id, roles)
    }
    
    // Assign groups if provided
    if (groups.length > 0) {
      await groupRepository.setUserGroups(newUser[0].id, groups, session.user.id)
    }

    // If user is admin, add to admin group automatically
    if (role === 'admin') {
      try {
        const adminGroup = await groupRepository.findByName('admin');
        if (adminGroup) {
          // Check if admin group is already in the groups list
          if (!groups.includes(adminGroup.id)) {
            await groupRepository.addUser(adminGroup.id, newUser[0].id, session.user.id);
            console.log(`Added admin user ${newUser[0].email} to admin group`);
          }
        } else {
          console.log('Admin group not found, creating one...');
          // Create admin group if it doesn't exist
          const [createdGroup] = await groupRepository.create({
            name: 'admin',
            description: 'System administrators with full access',
            isSystem: true,
            isActive: true
          });
          await groupRepository.addUser(createdGroup.id, newUser[0].id, session.user.id);
          console.log(`Created admin group and added user ${newUser[0].email}`);
        }
      } catch (error) {
        console.error('Failed to add user to admin group:', error);
        // Don't fail the user creation if group assignment fails
      }
    }

    return NextResponse.json({
      id: newUser[0].id,
      email: newUser[0].email,
      name: newUser[0].username,
      role: newUser[0].role,
      department: newUser[0].department,
      status: newUser[0].status
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
