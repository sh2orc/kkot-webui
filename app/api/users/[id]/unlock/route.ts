import { NextRequest, NextResponse } from "next/server"
import { userRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { createAuthOptions } from "@/app/api/auth/[...nextauth]/route"

interface Params {
  params: {
    id: string
  }
}

export async function POST(req: NextRequest, { params }: Params) {
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

    // Unlock user account
    await userRepository.update(resolvedParams.id, { 
      failed_login_attempts: 0,
      locked_until: null,
      status: 'active'
    })

    // Log the unlock action
    await userRepository.logActivity({
      user_id: session.user.id,
      action: 'unlock_account',
      resource_type: 'user',
      resource_id: resolvedParams.id,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ 
      success: true,
      message: "Account unlocked successfully"
    })
  } catch (error) {
    console.error("Error unlocking account:", error)
    return NextResponse.json(
      { error: "Failed to unlock account" },
      { status: 500 }
    )
  }
}
