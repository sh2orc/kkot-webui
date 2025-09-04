import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { groupRepository, llmModelRepository } from '@/lib/db/server'
import { filterResourcesByPermission } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get user's groups
    const userGroups = await groupRepository.getUserGroups(session.user.id);
    
    // 2. Get user's accessible resources
    const accessibleModels = await groupRepository.getUserAccessibleResources(
      session.user.id,
      'model',
      'enabled'
    );
    
    const accessibleAgents = await groupRepository.getUserAccessibleResources(
      session.user.id,
      'agent',
      'enabled'
    );
    
    // 3. Get all models and their public status
    const allModels = await llmModelRepository.findAllWithServer();
    const modelInfo = allModels.map((m: any) => ({
      id: m.id,
      modelId: m.modelId,
      isPublic: m.isPublic,
      enabled: m.enabled,
      provider: m.provider
    }));
    
    // 4. Test permission filtering
    const filteredModels = await filterResourcesByPermission(
      allModels,
      'model',
      'enabled'
    );
    
    // 5. Get group permissions for each group
    const groupPermissions = [];
    for (const group of userGroups) {
      const permissions = await groupRepository.getGroupPermissions(group.groupId);
      groupPermissions.push({
        groupId: group.groupId,
        groupName: group.name,
        permissions: permissions
      });
    }
    
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      },
      userGroups: userGroups,
      groupPermissions: groupPermissions,
      accessibleResources: {
        models: accessibleModels,
        agents: accessibleAgents
      },
      modelInfo: {
        total: allModels.length,
        public: modelInfo.filter((m: any) => m.isPublic).length,
        private: modelInfo.filter((m: any) => !m.isPublic).length,
        filtered: filteredModels.length,
        details: modelInfo
      },
      filteredModels: filteredModels.map((m: any) => ({
        id: m.id,
        modelId: m.modelId,
        isPublic: m.isPublic
      }))
    });
  } catch (error) {
    console.error('Debug permissions error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug information' },
      { status: 500 }
    );
  }
}
