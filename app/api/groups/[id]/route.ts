import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { groupRepository } from "@/lib/db/repository";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/groups/[id] - 그룹 상세 조회
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const group = await groupRepository.findById(id);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Get users in this group
    const users = await groupRepository.getUsers(id);
    
    // Get resource permissions
    const permissions = await groupRepository.getResourcePermissions(id);

    return NextResponse.json({
      ...group,
      users,
      permissions
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id] - 그룹 수정
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { name, description, isActive } = data;

    const { id } = await params;
    const group = await groupRepository.findById(id);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Update group
    const updatedGroup = await groupRepository.update(id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive })
    });

    return NextResponse.json(updatedGroup[0]);
  } catch (error: any) {
    console.error("Error updating group:", error);
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: "Group name already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

// PATCH /api/groups/[id] - 그룹 부분 수정 (활성 상태 토글)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { isActive } = data;

    const { id } = await params;
    const group = await groupRepository.findById(id);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // 시스템 그룹은 활성 상태를 변경할 수 없음
    if (group.isSystem) {
      return NextResponse.json(
        { error: "Cannot modify system group status" },
        { status: 403 }
      );
    }

    // Update only isActive field
    const updatedGroup = await groupRepository.update(id, {
      isActive: isActive
    });

    return NextResponse.json(updatedGroup[0]);
  } catch (error) {
    console.error("Error updating group status:", error);
    return NextResponse.json(
      { error: "Failed to update group status" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - 그룹 삭제
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const group = await groupRepository.findById(id);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    if (group.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system group" },
        { status: 403 }
      );
    }

    await groupRepository.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}