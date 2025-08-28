import { NextRequest, NextResponse } from "next/server"
import { userRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

interface Params {
  params: {
    id: string
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const users = await userRepository.findById(params.id)
    const user = users[0]

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Remove sensitive information
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
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
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const data = await req.json()
    const { name, email, role, password } = data

    const users = await userRepository.findById(params.id)
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
    if (password !== undefined) updateData.password = password

    const updatedUsers = await userRepository.update(params.id, updateData)
    const updatedUser = updatedUsers[0]

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.username,
      role: updatedUser.role
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
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const users = await userRepository.findById(params.id)
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

    await userRepository.delete(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
