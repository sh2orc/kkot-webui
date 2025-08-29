import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { groupRepository } from "@/lib/db/repository";

export type ResourceType = 'agent' | 'model' | 'rag_collection' | 'vector_store';
export type Permission = 'read' | 'write' | 'delete';

/**
 * Check if the current user has permission for a specific resource
 */
export async function checkResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  permission: Permission
): Promise<boolean> {
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
export async function filterResourcesByPermission<T extends { id: any }>(
  resources: T[],
  resourceType: ResourceType,
  permission: Permission = 'read'
): Promise<T[]> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return [];
  }

  // Admin has access to all resources
  if (session.user.role === 'admin') {
    return resources;
  }

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
  const session = await getServerSession(authOptions);
  if (!session) {
    return [];
  }

  return await groupRepository.getUserGroups(session.user.id);
}
