import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import { groupRepository } from "@/lib/db/repository";

// GET /api/groups - 그룹 목록 조회
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const groups = await groupRepository.findAll();
    
    // Get user count for each group
    const groupsWithUserCount = await Promise.all(
      groups.map(async (group: any) => {
        const users = await groupRepository.getUsers(group.id);
        return {
          ...group,
          userCount: users.length
        };
      })
    );

    return NextResponse.json(groupsWithUserCount);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST /api/groups - 그룹 생성
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    console.log('Groups POST - Session:', session);
    console.log('Groups POST - User role:', session?.user?.role);
    
    if (!session || session.user.role !== 'admin') {
      console.log('Groups POST - Access denied. Session exists:', !!session, 'Role:', session?.user?.role);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { id, name, description, isActive = true } = data;

    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    // Validate group ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Group ID can only contain letters, numbers, underscores, and hyphens" },
        { status: 400 }
      );
    }

    // Create new group
    const newGroup = await groupRepository.create({
      id,
      name,
      description,
      isActive,
      isSystem: false
    });

    return NextResponse.json(newGroup[0]);
  } catch (error: any) {
    console.error("Error creating group:", error);
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE') || error.message?.includes('duplicate')) {
      if (error.message?.includes('id')) {
        return NextResponse.json(
          { error: "Group ID already exists" },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: "Group name already exists" },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
