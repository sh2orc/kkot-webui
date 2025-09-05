import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { groupRepository } from "@/lib/db/repository";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/groups/[id]/permissions - 그룹의 리소스 권한 조회
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
    const searchParams = req.nextUrl.searchParams;
    const resourceType = searchParams.get('resourceType');

    const permissions = await groupRepository.getResourcePermissions(
      id,
      resourceType || undefined
    );

    // Group permissions by resource type
    const groupedPermissions = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.resourceType]) {
        acc[perm.resourceType] = [];
      }
      acc[perm.resourceType].push({
        resourceId: perm.resourceId,
        permissions: perm.permissions
      });
      return acc;
    }, {});

    return NextResponse.json({
      groupId: id,
      permissions: groupedPermissions
    });
  } catch (error) {
    console.error("Error fetching group permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch group permissions" },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/permissions - 그룹의 리소스 권한 설정
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

    const { id } = await params;

    // Prevent modifying admin group permissions
    if (id === 'admin') {
      return NextResponse.json(
        { error: "Cannot modify admin group permissions" },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { resourceType, resourceId, permissions } = data;

    if (!resourceType || !resourceId || !permissions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate resource type
    const validResourceTypes = ['agent', 'model', 'rag_collection', 'vector_store'];
    if (!validResourceTypes.includes(resourceType)) {
      return NextResponse.json(
        { error: "Invalid resource type" },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPermissions = ['read', 'write', 'delete', 'enabled'];
    if (!Array.isArray(permissions) || !permissions.every(p => validPermissions.includes(p))) {
      return NextResponse.json(
        { error: "Invalid permissions" },
        { status: 400 }
      );
    }

    await groupRepository.setResourcePermission(
      id,
      resourceType as any,
      resourceId,
      permissions
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting group permission:", error);
    return NextResponse.json(
      { error: "Failed to set group permission" },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id]/permissions - 그룹의 모든 리소스 권한 일괄 설정
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

    const { id } = await params;

    // Prevent modifying admin group permissions
    if (id === 'admin') {
      return NextResponse.json(
        { error: "Cannot modify admin group permissions" },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { permissions } = data;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Permissions must be an array" },
        { status: 400 }
      );
    }

    // Validate permissions
    const validResourceTypes = ['agent', 'model', 'rag_collection', 'vector_store'];
    const validPermissions = ['read', 'write', 'delete', 'enabled'];

    for (const perm of permissions) {
      if (!perm.resourceType || !perm.resourceId || !perm.permissions) {
        return NextResponse.json(
          { error: "Invalid permission format" },
          { status: 400 }
        );
      }

      if (!validResourceTypes.includes(perm.resourceType)) {
        return NextResponse.json(
          { error: "Invalid resource type" },
          { status: 400 }
        );
      }

      if (!Array.isArray(perm.permissions) || !perm.permissions.every((p: string) => validPermissions.includes(p))) {
        return NextResponse.json(
          { error: "Invalid permissions" },
          { status: 400 }
        );
      }
    }

    await groupRepository.bulkSetResourcePermissions(id, permissions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting group permissions:", error);
    return NextResponse.json(
      { error: "Failed to set group permissions" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/permissions - 그룹의 특정 리소스 권한 삭제
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

    // Prevent modifying admin group permissions
    if (id === 'admin') {
      return NextResponse.json(
        { error: "Cannot modify admin group permissions" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "Resource type and ID are required" },
        { status: 400 }
      );
    }

    await groupRepository.removeResourcePermission(id, resourceType, resourceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing group permission:", error);
    return NextResponse.json(
      { error: "Failed to remove group permission" },
      { status: 500 }
    );
  }
}