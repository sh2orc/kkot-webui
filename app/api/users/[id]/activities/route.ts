import { NextRequest, NextResponse } from "next/server"
import { userRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { createAuthOptions } from "@/app/api/auth/[...nextauth]/route"

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

    // Get user activity logs
    const activities = await userRepository.getUserActivityLogs(resolvedParams.id, {
      limit: 50,
      orderBy: 'created_at',
      order: 'DESC'
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error("Error fetching user activities:", error)
    return NextResponse.json(
      { error: "Failed to fetch user activities" },
      { status: 500 }
    )
  }
}
