import { NextRequest, NextResponse } from "next/server"
import { userRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { createAuthOptions } from "@/app/api/auth/[...nextauth]/route"

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

    const { userIds, action } = await req.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid user IDs" },
        { status: 400 }
      )
    }

    if (!action || !['activate', 'deactivate', 'suspend', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    // Prevent admin from modifying their own account
    if (userIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 }
      )
    }

    switch (action) {
      case 'activate':
        await userRepository.bulkUpdateStatus(userIds, 'active')
        break
      case 'deactivate':
        await userRepository.bulkUpdateStatus(userIds, 'inactive')
        break
      case 'suspend':
        await userRepository.bulkUpdateStatus(userIds, 'suspended')
        break
      case 'delete':
        await userRepository.bulkDelete(userIds)
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error performing bulk action:", error)
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    )
  }
}
