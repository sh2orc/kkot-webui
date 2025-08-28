import { NextRequest, NextResponse } from "next/server"
import { userRepository } from "@/lib/db/repository"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

interface Params {
  params: {
    id: string
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

    const { name, description, permissions } = await req.json()

    // Check if role exists
    const role = await userRepository.getRoleById(params.id)
    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      )
    }

    // Prevent editing system roles' name
    if (role.is_system && name !== role.name) {
      return NextResponse.json(
        { error: "Cannot change system role name" },
        { status: 400 }
      )
    }

    // Update role
    await userRepository.updateRole(params.id, {
      name,
      description
    })

    // Update role permissions
    if (permissions && Array.isArray(permissions)) {
      await userRepository.updateRolePermissions(params.id, permissions)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json(
      { error: "Failed to update role" },
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

    // Check if role exists
    const role = await userRepository.getRoleById(params.id)
    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      )
    }

    // Prevent deleting system roles
    if (role.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system role" },
        { status: 400 }
      )
    }

    // Delete role
    await userRepository.deleteRole(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting role:", error)
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    )
  }
}
