import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { groupRepository } from "@/lib/db/repository";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/groups/[id]/users - 그룹의 사용자 목록 조회
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

    const users = await groupRepository.getUsers(params.id);
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching group users:", error);
    return NextResponse.json(
      { error: "Failed to fetch group users" },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/users - 그룹에 사용자 추가
export async function POST(req: NextRequest, { params }: RouteParams) {
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
    const { userId } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Add user to group
    await groupRepository.addUser(params.id, userId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding user to group:", error);
    
    // Handle duplicate entry
    if (error.message?.includes('UNIQUE') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: "User already in group" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to add user to group" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/users/[userId] - 그룹에서 사용자 제거
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

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    await groupRepository.removeUser(params.id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing user from group:", error);
    return NextResponse.json(
      { error: "Failed to remove user from group" },
      { status: 500 }
    );
  }
}
