import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import { groupRepository } from "@/lib/db/repository";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/users/[id]/groups - 사용자의 그룹 목록 조회
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Await params to comply with Next.js 15 dynamic API rules
    const resolvedParams = await params
    
    // Check authentication
    const authOptions = await createAuthOptions()
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const groups = await groupRepository.getUserGroups(resolvedParams.id);
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch user groups" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id]/groups - 사용자의 그룹 설정 (전체 교체)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    // Await params to comply with Next.js 15 dynamic API rules
    const resolvedParams = await params
    
    // Check authentication
    const authOptions = await createAuthOptions()
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { groupIds } = data;

    if (!Array.isArray(groupIds)) {
      return NextResponse.json(
        { error: "Group IDs must be an array" },
        { status: 400 }
      );
    }

    await groupRepository.setUserGroups(resolvedParams.id, groupIds, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting user groups:", error);
    return NextResponse.json(
      { error: "Failed to set user groups" },
      { status: 500 }
    );
  }
}
