// This file is for server-side only
import 'server-only';

import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { generateId } from './utils';

// Get DB instance
const db = getDb();

interface GroupResourcePermission {
  resourceType: 'agent' | 'model' | 'rag_collection' | 'vector_store';
  resourceId: string;
  permissions: string[];
}

// Group related functions
export const groupRepository = {
  /**
   * Get all groups
   */
  findAll: async () => {
    return await db.select().from(schema.groups);
  },

  /**
   * Find group by ID
   */
  findById: async (id: string) => {
    const result = await db.select().from(schema.groups).where(eq(schema.groups.id, id)).limit(1);
    return result[0] || null;
  },

  /**
   * Find group by name
   */
  findByName: async (name: string) => {
    const result = await db.select().from(schema.groups).where(eq(schema.groups.name, name)).limit(1);
    return result[0] || null;
  },

  /**
   * Create a new group
   */
  create: async (groupData: { id: string, name: string; description?: string; isSystem?: boolean; isActive?: boolean }) => {
    const now = new Date();
    
    return await db.insert(schema.groups).values({
      id: groupData.id,
      name: groupData.name,
      description: groupData.description,
      isSystem: groupData.isSystem || false as any,
      isActive: groupData.isActive !== false as any,
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },

  /**
   * Update group
   */
  update: async (id: string, groupData: Partial<{ name: string; description: string; isActive: boolean }>) => {
    return await db.update(schema.groups)
      .set({ ...groupData, updatedAt: new Date() as any })
      .where(eq(schema.groups.id, id))
      .returning();
  },

  /**
   * Delete group (only non-system groups)
   */
  delete: async (id: string) => {
    const group = await groupRepository.findById(id);
    if (group && group.isSystem) {
      throw new Error('Cannot delete system group');
    }
    return await db.delete(schema.groups).where(eq(schema.groups.id, id));
  },

  /**
   * Get users in a group
   */
  getUsers: async (groupId: string) => {
    return await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        role: schema.users.role,
        assignedAt: schema.userGroups.assignedAt,
      })
      .from(schema.userGroups)
      .innerJoin(schema.users, eq(schema.userGroups.userId, schema.users.id))
      .where(eq(schema.userGroups.groupId, groupId));
  },

  /**
   * Add user to group
   */
  addUser: async (groupId: string, userId: string, assignedBy?: string) => {
    return await db.insert(schema.userGroups).values({
      groupId: groupId,
      userId: userId,
      assignedBy: assignedBy as any,
      assignedAt: new Date() as any
    }).returning();
  },

  /**
   * Remove user from group
   */
  removeUser: async (groupId: string, userId: string) => {
    return await db
      .delete(schema.userGroups)
      .where(
        and(
          eq(schema.userGroups.groupId, groupId as any),
          eq(schema.userGroups.userId, userId as any)
        )
      );
  },

  /**
   * Get user's groups
   */
  getUserGroups: async (userId: string) => {
    return await db
      .select({
        id: schema.groups.id,
        name: schema.groups.name,
        description: schema.groups.description,
        isSystem: schema.groups.isSystem,
        isActive: schema.groups.isActive,
        assignedAt: schema.userGroups.assignedAt,
      })
      .from(schema.userGroups)
      .innerJoin(schema.groups, eq(schema.userGroups.groupId, schema.groups.id))
      .where(eq(schema.userGroups.userId, userId as any));
  },

  /**
   * Set user groups (replace all groups)
   */
  setUserGroups: async (userId: string, groupIds: string[], assignedBy?: string) => {
    // Remove all existing groups
    await db.delete(schema.userGroups).where(eq(schema.userGroups.userId, userId as any));
    
    // Add new groups
    if (groupIds.length > 0) {
      const now = new Date();
      const values = groupIds.map(groupId => ({
        userId: userId as any,
        groupId: groupId as any,
        assignedBy: assignedBy as any,
        assignedAt: now as any
      }));
      
      return await db.insert(schema.userGroups).values(values);
    }
    
    return [];
  },

  /**
   * Get group resource permissions
   */
  getResourcePermissions: async (groupId: string, resourceType?: string) => {
    console.log('getResourcePermissions - groupId:', groupId, 'resourceType:', resourceType);
    
    let query = db
      .select()
      .from(schema.groupResourcePermissions)
      .where(eq(schema.groupResourcePermissions.groupId, groupId));
    
    if (resourceType) {
      query = query.where(
        and(
          eq(schema.groupResourcePermissions.groupId, groupId),
          eq(schema.groupResourcePermissions.resourceType, resourceType as any)
        )
      );
    }
    
    const results = await query;
    console.log('getResourcePermissions - Raw results:', results);
    
    const mappedResults = results.map((r: any) => ({
      id: r.id,
      groupId: r.groupId,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      permissions: JSON.parse(r.permissions),
    }));
    
    console.log('getResourcePermissions - Mapped results:', mappedResults);
    
    return mappedResults;
  },

  /**
   * Set resource permission for a group
   */
  setResourcePermission: async (
    groupId: string,
    resourceType: 'agent' | 'model' | 'rag_collection' | 'vector_store',
    resourceId: string,
    permissions: string[]
  ) => {
    const id = generateId();
    const now = new Date();
    
    // Check if permission already exists
    const existing = await db
      .select()
      .from(schema.groupResourcePermissions)
      .where(
        and(
          eq(schema.groupResourcePermissions.groupId, groupId),
          eq(schema.groupResourcePermissions.resourceType, resourceType),
          eq(schema.groupResourcePermissions.resourceId, resourceId)
        )
      )
      .limit(1);
    
    if (existing[0]) {
      // Update existing permission
      return await db
        .update(schema.groupResourcePermissions)
        .set({
          permissions: JSON.stringify(permissions),
          updatedAt: now as any
        })
        .where(eq(schema.groupResourcePermissions.id, existing[0].id))
        .returning();
    } else {
      // Create new permission
      return await db
        .insert(schema.groupResourcePermissions)
        .values({
          id: id as any,
          groupId: groupId,
          resourceType: resourceType,
          resourceId: resourceId,
          permissions: JSON.stringify(permissions),
          createdAt: now as any,
          updatedAt: now as any
        })
        .returning();
    }
  },

  /**
   * Remove resource permission
   */
  removeResourcePermission: async (groupId: string, resourceType: string, resourceId: string) => {
    return await db
      .delete(schema.groupResourcePermissions)
      .where(
        and(
          eq(schema.groupResourcePermissions.groupId, groupId),
          eq(schema.groupResourcePermissions.resourceType, resourceType as any),
          eq(schema.groupResourcePermissions.resourceId, resourceId)
        )
      );
  },

  /**
   * Check if user has permission for a resource
   */
  checkUserResourcePermission: async (
    userId: string,
    resourceType: 'agent' | 'model' | 'rag_collection' | 'vector_store',
    resourceId: string,
    permission: string
  ): Promise<boolean> => {
    // Check if user is admin
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId as any)).limit(1);
    if (user[0]?.role === 'admin') {
      return true;
    }

    // Get user's groups
    const userGroups = await db
      .select({ groupId: schema.userGroups.groupId })
      .from(schema.userGroups)
      .where(eq(schema.userGroups.userId, userId as any));
    
    if (userGroups.length === 0) {
      return false;
    }

    const groupIds = userGroups.map((ug: any) => ug.groupId);

    // Check permissions for user's groups
    const permissions = await db
      .select()
      .from(schema.groupResourcePermissions)
      .where(
        and(
          inArray(schema.groupResourcePermissions.groupId, groupIds),
          eq(schema.groupResourcePermissions.resourceType, resourceType),
          eq(schema.groupResourcePermissions.resourceId, resourceId)
        )
      );

    // Check if any group has the required permission
    for (const perm of permissions) {
      const perms = JSON.parse(perm.permissions);
      if (perms.includes(permission)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Get accessible resources for a user
   */
  getUserAccessibleResources: async (
    userId: string,
    resourceType: 'agent' | 'model' | 'rag_collection' | 'vector_store',
    permission: string = 'read'
  ): Promise<string[]> => {
    // Check if user is admin
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId as any)).limit(1);
    if (user[0]?.role === 'admin') {
      // Admin has access to all resources
      return ['*'];
    }

    // Get user's groups
    const userGroups = await db
      .select({ groupId: schema.userGroups.groupId })
      .from(schema.userGroups)
      .where(eq(schema.userGroups.userId, userId as any));
    
    if (userGroups.length === 0) {
      return [];
    }

    const groupIds = userGroups.map((ug: any) => ug.groupId);

    // Get permissions for user's groups
    const permissions = await db
      .select()
      .from(schema.groupResourcePermissions)
      .where(
        and(
          inArray(schema.groupResourcePermissions.groupId, groupIds),
          eq(schema.groupResourcePermissions.resourceType, resourceType)
        )
      );

    // Collect resource IDs with the required permission
    const resourceIds = new Set<string>();
    for (const perm of permissions) {
      const perms = JSON.parse(perm.permissions);
      if (perms.includes(permission)) {
        resourceIds.add(perm.resourceId);
      }
    }

    return Array.from(resourceIds);
  },

  /**
   * Bulk set resource permissions for a group
   */
  bulkSetResourcePermissions: async (groupId: string, permissions: GroupResourcePermission[]) => {
    console.log('bulkSetResourcePermissions - groupId:', groupId);
    console.log('bulkSetResourcePermissions - permissions:', permissions);
    
    // Remove all existing permissions for the group
    const deleteResult = await db.delete(schema.groupResourcePermissions).where(eq(schema.groupResourcePermissions.groupId, groupId));
    console.log('bulkSetResourcePermissions - Delete result:', deleteResult);
    
    // Add new permissions (even if array is empty, that's intentional)
    const now = new Date();
    const values = permissions.map(p => ({
      id: generateId() as any,
      groupId: groupId,
      resourceType: p.resourceType,
      resourceId: p.resourceId,
      permissions: JSON.stringify(p.permissions),
      createdAt: now as any,
      updatedAt: now as any
    }));
    
    console.log('bulkSetResourcePermissions - Insert values:', values);
    
    if (values.length > 0) {
      const insertResult = await db.insert(schema.groupResourcePermissions).values(values);
      console.log('bulkSetResourcePermissions - Insert result:', insertResult);
      return insertResult;
    } else {
      console.log('bulkSetResourcePermissions - No permissions to insert (all permissions disabled)');
      return [];
    }
  }
};
