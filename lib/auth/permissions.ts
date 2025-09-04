import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import { groupRepository } from "@/lib/db/repository";

export type ResourceType = 'agent' | 'model' | 'rag_collection' | 'vector_store';
export type Permission = 'read' | 'write' | 'delete' | 'enabled';

/**
 * Check if the current user has permission for a specific resource
 */
export async function checkResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  permission: Permission
): Promise<boolean> {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session) {
    return false;
  }

  return await groupRepository.checkUserResourcePermission(
    session.user.id,
    resourceType,
    resourceId,
    permission
  );
}

/**
 * Get accessible resources for the current user
 */
export async function getUserAccessibleResources(
  resourceType: ResourceType,
  permission: Permission = 'read'
): Promise<string[]> {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session) {
    return [];
  }

  return await groupRepository.getUserAccessibleResources(
    session.user.id,
    resourceType,
    permission
  );
}

/**
 * Filter resources based on user permissions
 */
export async function filterResourcesByPermission<T extends { id: any; isPublic?: boolean | number }>(
  resources: T[],
  resourceType: ResourceType,
  permission: Permission = 'read'
): Promise<T[]> {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session) {
    return [];
  }

  // Admin has access to all resources
  if (session.user.role === 'admin') {
    return resources;
  }

  // For models and agents, check isPublic first
  if (resourceType === 'model' || resourceType === 'agent') {
    // Separate public and private models
    const publicModels = resources.filter(resource => resource.isPublic === true || resource.isPublic === 1);
    const privateModels = resources.filter(resource => resource.isPublic !== true && resource.isPublic !== 1);
    
    console.log(`[Permission Check] Public ${resourceType}s: ${publicModels.length}, Private ${resourceType}s: ${privateModels.length}`);
    
    // Get accessible IDs for private resources
    const accessibleIds = await getUserAccessibleResources(resourceType, 'enabled');
    
    console.log(`[Permission Check] Accessible ${resourceType} IDs for user ${session.user.email}:`, accessibleIds);
    
    // If user has access to all resources (indicated by '*')
    if (accessibleIds.includes('*')) {
      return resources;
    }
    
    // Filter private resources based on permissions
    const accessiblePrivateModels = privateModels.filter(resource => {
      const hasAccess = accessibleIds.includes(String(resource.id));
      if (hasAccess) {
        const identifier = resource.modelId || resource.agentId || resource.name || resource.id;
        console.log(`[Permission Check] User has access to private ${resourceType}: ${identifier}`);
      }
      return hasAccess;
    });
    
    console.log(`[Permission Check] Accessible private ${resourceType}s: ${accessiblePrivateModels.length}`);
    
    // Return all public models + accessible private models
    return [...publicModels, ...accessiblePrivateModels];
  }

  // For other resource types, use existing logic
  const accessibleIds = await getUserAccessibleResources(resourceType, permission);
  
  // If user has access to all resources (indicated by '*')
  if (accessibleIds.includes('*')) {
    return resources;
  }

  // Filter resources based on accessible IDs
  return resources.filter(resource => 
    accessibleIds.includes(String(resource.id))
  );
}

/**
 * Middleware to check resource permission
 */
export async function requireResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  permission: Permission
): Promise<{ authorized: boolean; error?: string }> {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { authorized: false, error: "Unauthorized" };
  }

  const hasPermission = await checkResourcePermission(resourceType, resourceId, permission);
  
  if (!hasPermission) {
    return { authorized: false, error: "Forbidden: Insufficient permissions" };
  }

  return { authorized: true };
}

/**
 * Get user's groups
 */
export async function getUserGroups() {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session) {
    return [];
  }

  return await groupRepository.getUserGroups(session.user.id);
}
