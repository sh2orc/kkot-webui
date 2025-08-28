import { NextRequest, NextResponse } from "next/server"
import { userRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import crypto from "crypto"

interface Params {
  params: {
    id: string
  }
}

export async function POST(req: NextRequest, { params }: Params) {
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

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex')
    
    // Update user password
    await userRepository.update(params.id, { 
      password: tempPassword,
      // Force password change on next login could be implemented here
    })

    // In a real application, you would send this password via email
    // For now, we'll return it in the response (only for development)
    return NextResponse.json({ 
      success: true,
      message: "Password reset successfully",
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
